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

export const loadAttachmentsForAI = async (user: User, file: File): Promise<AnalyzeAttachment[]> => {
  const fileKey = fullKeyForFile(user, file)
  const isFileExists = await fileExists(fileKey)
  if (!isFileExists) {
    throw new Error("File not found in storage")
  }

  const { contentType, previews } = await generateFilePreviews(user, fileKey, file.mimetype)

  return Promise.all(
    previews.slice(0, MAX_PAGES_TO_ANALYZE).map(async (preview) => ({
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
