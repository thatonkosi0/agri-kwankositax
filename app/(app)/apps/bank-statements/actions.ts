"use server"

import { analyzeBankStatement, BankStatementRow } from "@/ai/bank-statement"
import { loadAttachmentsForAI } from "@/ai/attachments"
import { ActionState } from "@/lib/actions"
import { getCurrentUser, isAiBalanceExhausted, isSubscriptionExpired } from "@/lib/auth"
import { getUserStorageUsed, isEnoughStorageToUploadFile, storageKey, unsortedFilePath } from "@/lib/files"
import { getStorage } from "@/lib/storage"
import { createFile, deleteFile, getFileById, updateFile } from "@/models/files"
import { getSettings } from "@/models/settings"
import { createTransaction, TransactionData, updateTransactionFiles } from "@/models/transactions"
import { updateUser } from "@/models/users"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

// Bank statements can run to many pages; allow more than the single-document default.
const MAX_STATEMENT_PAGES = 12

export type StatementAnalysis = {
  fileId: string
  currency: string
  rows: BankStatementRow[]
}

export async function uploadAndAnalyzeStatementAction(formData: FormData): Promise<ActionState<StatementAnalysis>> {
  try {
    const user = await getCurrentUser()
    const file = formData.get("file") as File | null

    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" }
    }

    if (isAiBalanceExhausted(user)) {
      return { success: false, error: "You used all of your pre-paid AI scans, please upgrade your account" }
    }
    if (isSubscriptionExpired(user)) {
      return { success: false, error: "Your subscription has expired, please upgrade your account" }
    }
    if (!isEnoughStorageToUploadFile(user, file.size)) {
      return { success: false, error: "Insufficient storage to upload this statement" }
    }

    // Persist the uploaded statement so previews can be generated for the model.
    const fileUuid = randomUUID()
    const relativeFilePath = unsortedFilePath(fileUuid, file.name)
    const buffer = Buffer.from(await file.arrayBuffer())
    await getStorage().write(storageKey(user, relativeFilePath), buffer, file.type)

    const fileRecord = await createFile(user.id, {
      id: fileUuid,
      filename: file.name,
      path: relativeFilePath,
      mimetype: file.type,
      isReviewed: false,
      metadata: { size: file.size, lastModified: file.lastModified },
    })

    await updateUser(user.id, { storageUsed: await getUserStorageUsed(user) })

    const settings = await getSettings(user.id)

    // If preview generation or the AI call fails, don't leave the uploaded
    // statement orphaned in the unsorted queue — remove it before returning.
    let result
    try {
      const attachments = await loadAttachmentsForAI(user, fileRecord, MAX_STATEMENT_PAGES)
      result = await analyzeBankStatement(attachments, settings)
    } catch (error) {
      await deleteFile(fileRecord.id, user.id).catch(() => {})
      throw error
    }

    if (!result.success) {
      await deleteFile(fileRecord.id, user.id).catch(() => {})
      return {
        success: false,
        error:
          result.error === "All LLM providers failed or are not configured"
            ? "No AI provider is configured. Add an LLM API key in Settings → LLM (Google Gemini has a free tier), then try again."
            : result.error || "Failed to analyze statement",
      }
    }

    return {
      success: true,
      data: {
        fileId: fileRecord.id,
        currency: (result.currency || settings.default_currency || "ZAR").toUpperCase(),
        rows: result.rows || [],
      },
    }
  } catch (error) {
    console.error("Failed to analyze bank statement:", error)
    return { success: false, error: `Failed to analyze bank statement: ${error}` }
  }
}

export async function saveStatementRowsAction(
  fileId: string,
  rows: BankStatementRow[],
  currency: string,
  projectCode: string | null
): Promise<ActionState<{ created: number }>> {
  try {
    const user = await getCurrentUser()

    const file = await getFileById(fileId, user.id)
    if (!file) {
      return { success: false, error: "Statement file not found" }
    }
    if (!rows || rows.length === 0) {
      return { success: false, error: "No rows to save" }
    }

    let created = 0
    for (const row of rows) {
      const amount = Number(row.amount)
      if (!Number.isFinite(amount)) continue

      const data: TransactionData = {
        name: row.description || "Bank transaction",
        total: Math.round(Math.abs(amount) * 100),
        currencyCode: currency,
        issuedAt: row.date ? new Date(row.date) : null,
        type: row.direction === "income" ? "income" : "expense",
        projectCode: projectCode || null,
        note: "Imported from bank statement",
      }

      const transaction = await createTransaction(user.id, data)
      await updateTransactionFiles(transaction.id, user.id, [fileId])
      created++
    }

    // The statement itself is now processed — take it out of the unsorted queue.
    await updateFile(fileId, user.id, { isReviewed: true })

    revalidatePath("/transactions")
    revalidatePath("/unsorted")
    revalidatePath("/dashboard")

    return { success: true, data: { created } }
  } catch (error) {
    console.error("Failed to save statement rows:", error)
    return { success: false, error: `Failed to save statement rows: ${error}` }
  }
}
