import { constants } from "fs"
import { access, mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises"
import path from "path"
import { StorageBackend, StorageObject } from "./types"

// Filesystem-backed storage for self-hosted / Docker deployments. Keys are
// resolved under a single root directory, preserving the historical on-disk
// layout (UPLOAD_PATH/<email>/<relative-path>).
export class LocalStorageBackend implements StorageBackend {
  private readonly root: string

  constructor(root: string) {
    this.root = path.resolve(root)
  }

  private resolve(key: string): string {
    const full = path.resolve(this.root, path.normalize(key))
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new Error("Path traversal detected")
    }
    return full
  }

  async write(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key)
    await mkdir(path.dirname(full), { recursive: true })
    await writeFile(full, data)
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key))
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.resolve(key), constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true })
  }

  async removePrefix(prefix: string): Promise<void> {
    await rm(this.resolve(prefix), { recursive: true, force: true })
  }

  async list(prefix: string): Promise<StorageObject[]> {
    const base = this.resolve(prefix)
    const results: StorageObject[] = []

    const walk = async (dir: string): Promise<void> => {
      let entries
      try {
        entries = await readdir(dir, { withFileTypes: true })
      } catch {
        return // prefix does not exist yet
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
        } else if (entry.isFile()) {
          const stats = await stat(full)
          const key = path.relative(this.root, full).split(path.sep).join("/")
          results.push({ key, size: stats.size })
        }
      }
    }

    await walk(base)
    return results
  }
}
