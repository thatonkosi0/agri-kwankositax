"use server"

import { loadAttachmentsForAI } from "@/ai/attachments"
import { analyzeBankStatement, analyzeBankStatementText, BankStatementRow, CategoryHint } from "@/ai/bank-statement"
import { ActionState } from "@/lib/actions"
import { getCurrentUser, isAiBalanceExhausted, isSubscriptionExpired } from "@/lib/auth"
import {
  fullKeyForFile,
  getUserStorageUsed,
  isEnoughStorageToUploadFile,
  storageKey,
  unsortedFilePath,
} from "@/lib/files"
import { extractPdfPages, getPdfPageCount } from "@/lib/pdf-split"
import { rasterizePdfBufferToImages } from "@/lib/previews/pdf"
import { getStorage } from "@/lib/storage"
import { getCategories } from "@/models/categories"
import { createFile, getFileById, updateFile } from "@/models/files"
import { getProjectByCode } from "@/models/projects"
import { getSettings } from "@/models/settings"
import { createTransactionsBulk, TransactionData } from "@/models/transactions"
import { updateUser } from "@/models/users"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

// The category hints handed to the model: only categories that carry an
// llm_prompt guide classification, but every code is a valid assignment target.
async function categoryHints(userId: string): Promise<CategoryHint[]> {
  const categories = await getCategories(userId)
  return categories.map((c) => ({ code: c.code, llm_prompt: c.llm_prompt }))
}

export type StatementUpload = {
  fileId: string
  mimetype: string
  pageCount: number
  defaultCurrency: string
}

// Step 1: store the statement and report how many pages it has. Fast — it never
// calls the LLM, so it can't hit the function time limit. The client then drives
// analysis one small page-range at a time (see analyzeStatementChunkAction).
export async function uploadStatementAction(formData: FormData): Promise<ActionState<StatementUpload>> {
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

    const fileUuid = randomUUID()
    const relativeFilePath = unsortedFilePath(fileUuid, file.name)
    const buffer = Buffer.from(await file.arrayBuffer())
    await getStorage().write(storageKey(user, relativeFilePath), buffer, file.type)

    const fileRecord = await createFile(user.id, {
      id: fileUuid,
      filename: file.name,
      path: relativeFilePath,
      mimetype: file.type,
      // Mark reviewed so the statement does NOT land in the Unsorted queue (where
      // the single-shot receipt analyzer would try — and time out — on it). The
      // bank-statements app analyzes it directly, page by page.
      isReviewed: true,
      metadata: { size: file.size, lastModified: file.lastModified },
    })

    await updateUser(user.id, { storageUsed: await getUserStorageUsed(user) })

    let pageCount = 1
    if (file.type === "application/pdf") {
      try {
        pageCount = await getPdfPageCount(buffer)
      } catch {
        pageCount = 1 // fall back to a single request if the PDF can't be parsed
      }
    }

    const settings = await getSettings(user.id)

    return {
      success: true,
      data: {
        fileId: fileRecord.id,
        mimetype: file.type,
        pageCount,
        defaultCurrency: (settings.default_currency || "ZAR").toUpperCase(),
      },
    }
  } catch (error) {
    console.error("Failed to upload statement:", error)
    return { success: false, error: `Failed to upload statement: ${error}` }
  }
}

export type StatementChunk = {
  rows: BankStatementRow[]
  currency?: string
}

// Step 2: analyse a single page range. Called repeatedly by the client for each
// batch of pages, so every request stays comfortably under the 60s limit.
export async function analyzeStatementChunkAction(
  fileId: string,
  startPage: number,
  endPage: number
): Promise<ActionState<StatementChunk>> {
  try {
    const user = await getCurrentUser()
    const file = await getFileById(fileId, user.id)
    if (!file) {
      return { success: false, error: "Statement file not found" }
    }

    const settings = await getSettings(user.id)

    let attachments
    if (file.mimetype === "application/pdf") {
      // Render just this page range to images and let the model read them as a
      // picture — far more reliable on real tabular statements than raw PDF text.
      const fullBytes = await getStorage().read(fullKeyForFile(user, file))
      const chunkPdf = await extractPdfPages(fullBytes, startPage, endPage)
      const images = await rasterizePdfBufferToImages(chunkPdf)
      attachments = images.map((img) => ({
        filename: file.filename,
        contentType: img.contentType,
        base64: img.base64,
      }))
    } else {
      // Non-PDF (image) statements are a single "page".
      attachments = await loadAttachmentsForAI(user, file)
    }

    const result = await analyzeBankStatement(attachments, settings)
    if (!result.success) {
      return {
        success: false,
        error:
          result.error === "All LLM providers failed or are not configured"
            ? "No AI provider is configured. Add an LLM API key in Settings → LLM (Google Gemini has a free tier), then try again."
            : result.error || "Failed to analyze statement",
      }
    }

    return { success: true, data: { rows: result.rows || [], currency: result.currency } }
  } catch (error) {
    console.error("Failed to analyze statement chunk:", error)
    return { success: false, error: `Failed to analyze pages ${startPage}-${endPage}: ${error}` }
  }
}

export type StatementImage = { contentType: string; base64: string }

// Analyzes page images that were already rendered by the BROWSER. The browser has
// fonts and a canvas natively, so it renders real statements reliably — unlike
// serverless pdf.js/canvas. The server only makes the (fast) Gemini vision call,
// so this can't hit the function time limit on rendering.
export async function analyzeStatementImagesAction(
  images: StatementImage[]
): Promise<ActionState<StatementChunk>> {
  try {
    const user = await getCurrentUser()
    if (!images || images.length === 0) {
      return { success: false, error: "No page images provided" }
    }

    const settings = await getSettings(user.id)
    const attachments = images.map((img, i) => ({
      filename: `page-${i + 1}`,
      contentType: img.contentType,
      base64: img.base64,
    }))

    const result = await analyzeBankStatement(attachments, settings, await categoryHints(user.id))
    if (!result.success) {
      return {
        success: false,
        error:
          result.error === "All LLM providers failed or are not configured"
            ? "No AI provider is configured. Add an LLM API key in Settings → LLM (Google Gemini has a free tier), then try again."
            : result.error || "Failed to analyze statement",
      }
    }

    return { success: true, data: { rows: result.rows || [], currency: result.currency } }
  } catch (error) {
    console.error("Failed to analyze statement images:", error)
    return { success: false, error: `Failed to analyze statement: ${error}` }
  }
}

// Analyzes the TEXT of one statement page, extracted in the browser by pdf.js.
// Text-based PDFs (the vast majority of bank statements) parse in a couple of
// seconds this way — no image rendering, no vision latency — so the request
// can't approach the 60s function limit that the image path kept hitting.
export async function analyzeStatementTextAction(
  pageText: string
): Promise<ActionState<StatementChunk>> {
  try {
    const user = await getCurrentUser()
    // A blank page (or a scanned page with no text layer) simply yields no rows.
    if (!pageText || pageText.trim().length === 0) {
      return { success: true, data: { rows: [] } }
    }

    const settings = await getSettings(user.id)
    const result = await analyzeBankStatementText(pageText, settings, await categoryHints(user.id))
    if (!result.success) {
      return {
        success: false,
        error:
          result.error === "All LLM providers failed or are not configured"
            ? "No AI provider is configured. Add an LLM API key in Settings → LLM (Google Gemini has a free tier), then try again."
            : result.error || "Failed to analyze statement",
      }
    }

    return { success: true, data: { rows: result.rows || [], currency: result.currency } }
  } catch (error) {
    console.error("Failed to analyze statement text:", error)
    return { success: false, error: `Failed to analyze statement: ${error}` }
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

    const settings = await getSettings(user.id)
    // Foreign keys reject any category code that isn't NULL or one the user owns,
    // so resolve each row's suggested category against the real set once up front.
    const validCategoryCodes = new Set((await getCategories(user.id)).map((c) => c.code))
    const defaultCategory =
      settings.default_category && validCategoryCodes.has(settings.default_category)
        ? settings.default_category
        : null
    const resolveCategory = (suggested?: string): string | null =>
      suggested && validCategoryCodes.has(suggested) ? suggested : defaultCategory

    // A project may only be assigned if it exists; an unknown code would fail the
    // whole batch on the foreign key, so drop it to null when it doesn't resolve.
    const validProject = projectCode && (await getProjectByCode(projectCode)) ? projectCode : null

    const toSave: TransactionData[] = []
    for (const row of rows) {
      const amount = Number(row.amount)
      if (!Number.isFinite(amount)) continue

      // The AI is asked for YYYY-MM-DD, but guard against an unparseable value —
      // an Invalid Date would fail the whole insert.
      let issuedAt: Date | null = null
      if (row.date) {
        const parsed = new Date(row.date)
        if (!Number.isNaN(parsed.getTime())) issuedAt = parsed
      }

      toSave.push({
        name: row.description || "Bank transaction",
        total: Math.round(Math.abs(amount) * 100),
        currencyCode: currency,
        issuedAt,
        type: row.direction === "income" ? "income" : "expense",
        categoryCode: resolveCategory(row.category),
        projectCode: validProject,
        note: "Imported from bank statement",
        files: [fileId],
      })
    }

    if (toSave.length === 0) {
      return { success: false, error: "No valid transactions to save" }
    }

    const created = await createTransactionsBulk(user.id, toSave)

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
