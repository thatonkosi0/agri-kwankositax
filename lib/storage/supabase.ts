import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { StorageBackend, StorageObject } from "./types"

// Supabase Storage backend for serverless hosts (e.g. Vercel) where the local
// filesystem is ephemeral. Uses the service-role key, so it must only ever run
// server-side.
export class SupabaseStorageBackend implements StorageBackend {
  private readonly client: SupabaseClient
  private readonly bucket: string

  constructor(url: string, serviceRoleKey: string, bucket: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    this.bucket = bucket
  }

  private store() {
    return this.client.storage.from(this.bucket)
  }

  async write(key: string, data: Buffer, contentType?: string): Promise<void> {
    const { error } = await this.store().upload(key, data, {
      contentType: contentType || "application/octet-stream",
      upsert: true,
    })
    if (error) throw error
  }

  async read(key: string): Promise<Buffer> {
    const { data, error } = await this.store().download(key)
    if (error || !data) throw error ?? new Error(`Storage object not found: ${key}`)
    return Buffer.from(await data.arrayBuffer())
  }

  async exists(key: string): Promise<boolean> {
    const slash = key.lastIndexOf("/")
    const dir = slash === -1 ? "" : key.slice(0, slash)
    const name = slash === -1 ? key : key.slice(slash + 1)
    const { data, error } = await this.store().list(dir, { search: name, limit: 100 })
    if (error) return false
    return !!data?.some((item) => item.name === name)
  }

  async remove(key: string): Promise<void> {
    const { error } = await this.store().remove([key])
    if (error) throw error
  }

  async removePrefix(prefix: string): Promise<void> {
    const objects = await this.list(prefix)
    if (objects.length === 0) return
    // Supabase caps removals per request; delete in batches.
    const keys = objects.map((o) => o.key)
    for (let i = 0; i < keys.length; i += 100) {
      const { error } = await this.store().remove(keys.slice(i, i + 100))
      if (error) throw error
    }
  }

  async list(prefix: string): Promise<StorageObject[]> {
    const results: StorageObject[] = []

    const walk = async (dir: string): Promise<void> => {
      const { data, error } = await this.store().list(dir, { limit: 1000 })
      if (error || !data) return
      for (const item of data) {
        const childKey = dir ? `${dir}/${item.name}` : item.name
        // Supabase returns "folders" as entries with a null id / no metadata.
        if (item.id === null || item.metadata == null) {
          await walk(childKey)
        } else {
          const size = typeof item.metadata.size === "number" ? item.metadata.size : 0
          results.push({ key: childKey, size })
        }
      }
    }

    await walk(prefix.replace(/\/+$/, ""))
    return results
  }
}
