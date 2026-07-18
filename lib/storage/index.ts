import config from "@/lib/config"
import path from "path"
import { LocalStorageBackend } from "./local"
import { SupabaseStorageBackend } from "./supabase"
import { StorageBackend } from "./types"

export type { StorageBackend, StorageObject } from "./types"

// Root for the local filesystem backend. Defined here (not imported from
// lib/files) to avoid a circular dependency.
export const LOCAL_STORAGE_ROOT = path.resolve(process.env.UPLOAD_PATH || "./uploads")

let instance: StorageBackend | null = null

export function getStorage(): StorageBackend {
  if (instance) return instance

  if (config.storage.backend === "supabase") {
    const { url, serviceRoleKey, bucket } = config.storage.supabase
    if (!url || !serviceRoleKey) {
      throw new Error(
        "STORAGE_BACKEND=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set"
      )
    }
    instance = new SupabaseStorageBackend(url, serviceRoleKey, bucket)
  } else {
    instance = new LocalStorageBackend(LOCAL_STORAGE_ROOT)
  }

  return instance
}
