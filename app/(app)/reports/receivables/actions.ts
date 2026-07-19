"use server"

import { ActionState } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"
import { sendInvoiceReminderEmail } from "@/lib/email"
import { formatCurrency } from "@/lib/utils"
import { getTransactionById, setTransactionPaidStatus } from "@/models/transactions"
import { Transaction } from "@/prisma/client"
import { revalidatePath } from "next/cache"

export async function markInvoicePaidAction(
  transactionId: string,
  paid: boolean
): Promise<ActionState<Transaction>> {
  try {
    const user = await getCurrentUser()
    const transaction = await setTransactionPaidStatus(transactionId, user.id, paid)
    revalidatePath("/reports/receivables")
    revalidatePath("/dashboard")
    return { success: true, data: transaction }
  } catch (error) {
    console.error("Failed to update invoice status:", error)
    return { success: false, error: "Failed to update invoice status" }
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Sends a payment reminder email for an unpaid invoice. This is only ever
// triggered by an explicit user click in the receivables UI — it is never sent
// automatically.
export async function sendInvoiceReminderAction(
  transactionId: string,
  recipientEmail: string
): Promise<ActionState<null>> {
  try {
    if (!EMAIL_RE.test(recipientEmail.trim())) {
      return { success: false, error: "Please enter a valid recipient email address" }
    }

    const user = await getCurrentUser()
    const invoice = await getTransactionById(transactionId, user.id)
    if (!invoice) {
      return { success: false, error: "Invoice not found" }
    }
    if (invoice.type !== "income") {
      return { success: false, error: "Only invoices can be reminded" }
    }

    const due = invoice.dueDate ?? invoice.issuedAt ?? null
    const daysOverdue = due ? Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0

    await sendInvoiceReminderEmail({
      to: recipientEmail.trim(),
      invoiceName: invoice.name || "your invoice",
      amount: formatCurrency(invoice.total ?? 0, invoice.currencyCode || "ZAR"),
      dueDate: due ? due.toISOString().split("T")[0] : null,
      daysOverdue: Math.max(0, daysOverdue),
      businessName: user.businessName || user.name || "Agri-Kwankosi",
    })

    return { success: true, data: null }
  } catch (error) {
    console.error("Failed to send invoice reminder:", error)
    return { success: false, error: "Failed to send reminder email" }
  }
}
