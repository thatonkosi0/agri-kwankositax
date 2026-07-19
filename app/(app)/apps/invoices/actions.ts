"use server"

import { getCurrentUser, isSubscriptionExpired } from "@/lib/auth"
import { getTransactionFileUploadPath, isEnoughStorageToUploadFile, storageKey } from "@/lib/files"
import { getStorage } from "@/lib/storage"
import { getAppData, setAppData } from "@/models/apps"
import { createFile } from "@/models/files"
import {
  createTransaction,
  updateTransactionFiles,
  TransactionData,
  findDuplicateTransaction,
} from "@/models/transactions"
import { Transaction } from "@/prisma/client"
import { renderToBuffer } from "@react-pdf/renderer"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { createElement } from "react"
import { InvoiceFormData } from "./components/invoice-page"
import { InvoicePDF } from "./components/invoice-pdf"
import { InvoiceTemplate } from "./default-templates"
import { InvoiceAppData } from "./page"

export async function generateInvoicePDF(data: InvoiceFormData): Promise<Uint8Array> {
  const pdfElement = createElement(InvoicePDF, { data })
  const buffer = await renderToBuffer(pdfElement as any)
  return new Uint8Array(buffer)
}

export async function addNewTemplateAction(template: InvoiceTemplate) {
  // Derive the user server-side; never trust a client-supplied user (IDOR).
  const user = await getCurrentUser()
  const appData = (await getAppData(user, "invoices")) as InvoiceAppData | null
  const updatedTemplates = [...(appData?.templates || []), template]
  const appDataResult = await setAppData(user, "invoices", { ...appData, templates: updatedTemplates })
  return { success: true, data: appDataResult }
}

export async function deleteTemplateAction(templateId: string) {
  // Derive the user server-side; never trust a client-supplied user (IDOR).
  const user = await getCurrentUser()
  const appData = (await getAppData(user, "invoices")) as InvoiceAppData | null
  if (!appData) return { success: false, error: "No app data found" }

  const updatedTemplates = appData.templates.filter((t) => t.id !== templateId)
  const appDataResult = await setAppData(user, "invoices", { ...appData, templates: updatedTemplates })
  return { success: true, data: appDataResult }
}

export async function saveInvoiceAsTransactionAction(
  formData: InvoiceFormData,
  forceSave: boolean = false
): Promise<{
  success: boolean
  error?: string
  data?: Transaction
  duplicateData?: {
    existingTransaction: Transaction
    newTransactionData: Record<string, unknown>
  }
}> {
  try {
    const user = await getCurrentUser()

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(formData)

    // Calculate total amount from items
    const subtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0)
    const taxes = formData.additionalTaxes.reduce((sum, tax) => sum + tax.amount, 0)
    const fees = formData.additionalFees.reduce((sum, fee) => sum + fee.amount, 0)
    const totalAmount = (formData.taxIncluded ? subtotal : subtotal + taxes) + fees

    // Create transaction. Invoices are tracked as unpaid receivables with a due
    // date so they surface in the receivables/aging report until marked paid.
    const rawTransactionData: TransactionData = {
      name: `Invoice #${formData.invoiceNumber || "unknown"}`,
      merchant: `${formData.billTo.split("\n")[0]}`,
      total: totalAmount * 100,
      currencyCode: formData.currency,
      issuedAt: new Date(formData.date),
      categoryCode: null,
      projectCode: null,
      type: "income",
      status: "unpaid",
      dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
    }

    // --- Deduplication Check ---
    if (!forceSave) {
      const existingTransaction = await findDuplicateTransaction(user.id, rawTransactionData)

      if (existingTransaction) {
        return {
          success: false,
          error: "DUPLICATE_FOUND",
          duplicateData: {
            existingTransaction: existingTransaction,
            newTransactionData: rawTransactionData,
          },
        }
      }
    }

    const transaction = await createTransaction(user.id, rawTransactionData)

    // Check storage limits
    if (!isEnoughStorageToUploadFile(user, pdfBuffer.length)) {
      return {
        success: false,
        error: "Insufficient storage to save invoice PDF",
      }
    }

    if (isSubscriptionExpired(user)) {
      return {
        success: false,
        error: "Your subscription has expired, please upgrade your account or buy new subscription plan",
      }
    }

    // Save PDF file
    const fileUuid = randomUUID()
    const fileName = `invoice-${formData.invoiceNumber}.pdf`
    const relativeFilePath = getTransactionFileUploadPath(fileUuid, fileName, transaction)
    await getStorage().write(storageKey(user, relativeFilePath), Buffer.from(pdfBuffer), "application/pdf")

    // Create file record in database
    const fileRecord = await createFile(user.id, {
      id: fileUuid,
      filename: fileName,
      path: relativeFilePath,
      mimetype: "application/pdf",
      isReviewed: true,
      metadata: {
        size: pdfBuffer.length,
        lastModified: Date.now(),
      },
    })

    // Update transaction with the file ID
    await updateTransactionFiles(transaction.id, user.id, [fileRecord.id])

    revalidatePath("/transactions")

    return { success: true, data: transaction }
  } catch (error) {
    console.error("Failed to save invoice as transaction:", error)
    return {
      success: false,
      error: `Failed to save invoice as transaction: ${error}`,
    }
  }
}
