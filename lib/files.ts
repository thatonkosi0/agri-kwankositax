import { File, Transaction, User } from "@/prisma/client"
import config from "./config"
import { getStorage } from "./storage"

export const FILE_UNSORTED_DIRECTORY_NAME = "unsorted"
export const FILE_PREVIEWS_DIRECTORY_NAME = "previews"
export const FILE_STATIC_DIRECTORY_NAME = "static"
export const FILE_IMPORT_CSV_DIRECTORY_NAME = "csv"

// Build a POSIX storage key from path segments, guarding against traversal.
export function joinKey(...parts: string[]): string {
  const segments: string[] = []
  for (const part of parts) {
    for (const seg of part.split("/")) {
      if (seg === "" || seg === ".") continue
      if (seg === "..") throw new Error("Path traversal detected")
      segments.push(seg)
    }
  }
  return segments.join("/")
}

// Per-user key prefix. Kept as the email to preserve the historical on-disk
// layout (UPLOAD_PATH/<email>/...) so existing self-hosted data still resolves.
export function userScope(user: Pick<User, "email">): string {
  return user.email
}

export function storageKey(user: Pick<User, "email">, ...relative: string[]): string {
  return joinKey(userScope(user), ...relative)
}

export function extname(filename: string): string {
  const base = filename.split("/").pop() || filename
  const i = base.lastIndexOf(".")
  return i <= 0 ? "" : base.slice(i)
}

export function basenameNoExt(filename: string): string {
  const base = filename.split("/").pop() || filename
  const ext = extname(base)
  return ext ? base.slice(0, -ext.length) : base
}

export function unsortedFilePath(fileUuid: string, filename: string): string {
  return joinKey(FILE_UNSORTED_DIRECTORY_NAME, `${fileUuid}${extname(filename)}`)
}

export function previewFilePath(fileUuid: string, page: number): string {
  return joinKey(FILE_PREVIEWS_DIRECTORY_NAME, `${fileUuid}.${page}.webp`)
}

export function getTransactionFileUploadPath(fileUuid: string, filename: string, transaction: Transaction): string {
  return formatFilePath(`${fileUuid}${extname(filename)}`, transaction.issuedAt || new Date())
}

// Full storage key for a stored file record (scoped under the owning user).
export function fullKeyForFile(user: Pick<User, "email">, file: Pick<File, "path">): string {
  return storageKey(user, file.path)
}

export function getStaticKey(user: Pick<User, "email">, filename: string): string {
  return storageKey(user, FILE_STATIC_DIRECTORY_NAME, filename)
}

export function getUserPreviewsScope(user: Pick<User, "email">): string {
  return storageKey(user, FILE_PREVIEWS_DIRECTORY_NAME)
}

function formatFilePath(filename: string, date: Date, format = "{YYYY}/{MM}/{name}{ext}"): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const ext = extname(filename)
  const name = basenameNoExt(filename)
  return format
    .replace("{YYYY}", String(year))
    .replace("{MM}", month)
    .replace("{name}", name)
    .replace("{ext}", ext)
}

export async function fileExists(key: string): Promise<boolean> {
  return getStorage().exists(key)
}

// Total bytes stored for a user, used for storage-quota accounting.
export async function getUserStorageUsed(user: Pick<User, "email">): Promise<number> {
  const objects = await getStorage().list(userScope(user))
  return objects.reduce((total, obj) => total + obj.size, 0)
}

export function isEnoughStorageToUploadFile(user: User, fileSize: number): boolean {
  if (config.selfHosted.isEnabled || user.storageLimit < 0) {
    return true
  }
  return user.storageUsed + fileSize <= user.storageLimit
}
