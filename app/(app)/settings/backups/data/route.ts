import { getCurrentUser } from "@/lib/auth"
import { userScope } from "@/lib/files"
import { getStorage } from "@/lib/storage"
import { MODEL_BACKUP, modelToJSON } from "@/models/backups"
import { updateProgress } from "@/models/progress"
import JSZip from "jszip"
import { NextResponse } from "next/server"

// Building a full backup archive can be slow; allow up to 60s on serverless.
export const maxDuration = 60

const MAX_FILE_SIZE = 64 * 1024 * 1024 // 64MB
const BACKUP_VERSION = "1.0"
const PROGRESS_UPDATE_INTERVAL_MS = 2000 // 2 seconds

export async function GET(request: Request) {
  const user = await getCurrentUser()
  const storage = getStorage()
  const scope = userScope(user)
  const url = new URL(request.url)
  const progressId = url.searchParams.get("progressId")

  try {
    const zip = new JSZip()
    const rootFolder = zip.folder("data")
    if (!rootFolder) {
      console.error("Failed to create zip folder")
      return new NextResponse("Internal Server Error", { status: 500 })
    }

    // Add metadata with version information
    rootFolder.file(
      "metadata.json",
      JSON.stringify(
        {
          version: BACKUP_VERSION,
          timestamp: new Date().toISOString(),
          models: MODEL_BACKUP.map((m) => m.filename),
        },
        null,
        2
      )
    )

    // Backup models
    for (const backup of MODEL_BACKUP) {
      try {
        const jsonContent = await modelToJSON(user.id, backup)
        rootFolder.file(backup.filename, jsonContent)
      } catch (error) {
        console.error(`Error exporting table ${backup.filename}:`, error)
      }
    }

    const uploadsFolder = rootFolder.folder("uploads")
    if (!uploadsFolder) {
      console.error("Failed to create uploads folder")
      return new NextResponse("Internal Server Error", { status: 500 })
    }

    const uploadedFiles = await storage.list(scope)

    // Update progress with total files if progressId is provided
    if (progressId) {
      await updateProgress(user.id, progressId, { total: uploadedFiles.length })
    }

    let processedFiles = 0
    let lastProgressUpdate = Date.now()

    for (const object of uploadedFiles) {
      try {
        if (object.size > MAX_FILE_SIZE) {
          console.warn(
            `Skipping large file ${object.key} (${Math.round(object.size / 1024 / 1024)}MB > ${
              MAX_FILE_SIZE / 1024 / 1024
            }MB limit)`
          )
          continue
        }

        const fileContent = await storage.read(object.key)
        // Store paths relative to the user scope (matching the restore side).
        const relativePath = object.key.startsWith(scope + "/") ? object.key.slice(scope.length + 1) : object.key
        uploadsFolder.file(relativePath, fileContent)

        processedFiles++

        // Update progress every PROGRESS_UPDATE_INTERVAL_MS milliseconds
        const now = Date.now()
        if (progressId && now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL_MS) {
          await updateProgress(user.id, progressId, { current: processedFiles })
          lastProgressUpdate = now
        }
      } catch (error) {
        console.error(`Error reading file ${object.key}:`, error)
      }
    }

    // Final progress update
    if (progressId) {
      await updateProgress(user.id, progressId, { current: uploadedFiles.length })
    }

    const archive = await zip.generateAsync({ type: "nodebuffer" })

    return new NextResponse(new Uint8Array(archive), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="agri-kwankositax-backup.zip"`,
      },
    })
  } catch (error) {
    console.error("Error exporting database:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
