// A storage key is always a POSIX-style relative path (e.g. "user@example.com/unsorted/uuid.jpg").
// Backends map it to a filesystem path or an object-store key.
export interface StorageObject {
  key: string
  size: number
}

export interface StorageBackend {
  write(key: string, data: Buffer, contentType?: string): Promise<void>
  read(key: string): Promise<Buffer>
  exists(key: string): Promise<boolean>
  remove(key: string): Promise<void>
  // Recursively delete everything under a key prefix (e.g. a whole user's files).
  removePrefix(prefix: string): Promise<void>
  // Recursively list everything under a key prefix (used for storage accounting).
  list(prefix: string): Promise<StorageObject[]>
}
