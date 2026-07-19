import { fileExists, fullKeyForFile } from "@/lib/files"
import { generateFilePreviews } from "@/lib/previews/generate"
import { getStorage } from "@/lib/storage"
import { File, User } from "@/prisma/client"

const MAX_PAGES_TO_ANALYZE = 4

export type AnalyzeAttachment = {
  filename: string
  contentType: string
  base64: string
}

// maxPages defaults to the single-document limit. Multi-page documents such as
// bank statements pass a higher limit so every page reaches the model.
export const loadAttachmentsForAI = async (
  user: User,
  file: File,
  maxPages: number = MAX_PAGES_TO_ANALYZE
): Promise<AnalyzeAttachment[]> => {
  const fileKey = fullKeyForFile(user, file)
  const isFileExists = await fileExists(fileKey)
  if (!isFileExists) {
    throw new Error("File not found in storage")
  }

  // Send PDFs to the model natively rather than rasterizing them to page images.
  // The LLM (Gemini) reads every page of a multi-page PDF directly, which avoids
  // the fragile serverless pdf.js/canvas rasterization that renders blank on some
  // hosts, and removes the per-document page cap. Images are still resized to a
  // single preview to keep the request small.
  if (file.mimetype === "application/pdf") {
    return [
      {
        filename: file.filename,
        contentType: "application/pdf",
        base64: await loadKeyAsBase64(fileKey),
      },
    ]
  }

  const { contentType, previews } = await generateFilePreviews(user, fileKey, file.mimetype)

  return Promise.all(
    previews.slice(0, maxPages).map(async (preview) => ({
      filename: file.filename,
      contentType: contentType,
      base64: await loadKeyAsBase64(preview),
    }))
  )
}

export const loadKeyAsBase64 = async (key: string): Promise<string> => {
  const buffer = await getStorage().read(key)
  return buffer.toString("base64")
}
