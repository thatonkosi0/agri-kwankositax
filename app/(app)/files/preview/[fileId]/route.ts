import { getCurrentUser } from "@/lib/auth"
import { fileExists, fullKeyForFile } from "@/lib/files"
import { generateFilePreviews } from "@/lib/previews/generate"
import { getStorage } from "@/lib/storage"
import { encodeFilename } from "@/lib/utils"
import { getFileById } from "@/models/files"
import { NextResponse } from "next/server"

// PDF rendering can be slow; allow up to 60s on serverless hosts.
export const maxDuration = 60

export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params
  const user = await getCurrentUser()

  if (!fileId) {
    return new NextResponse("No fileId provided", { status: 400 })
  }

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get("page") || "1", 10)

  try {
    // Find file in database
    const file = await getFileById(fileId, user.id)

    if (!file || file.userId !== user.id) {
      return new NextResponse("File not found or does not belong to the user", { status: 404 })
    }

    // Check if file exists in storage
    const fileKey = fullKeyForFile(user, file)
    const isFileExists = await fileExists(fileKey)
    if (!isFileExists) {
      return new NextResponse(`File not found in storage: ${file.path}`, { status: 404 })
    }

    // Generate previews
    const { contentType, previews } = await generateFilePreviews(user, fileKey, file.mimetype)
    if (page > previews.length) {
      return new NextResponse("Page not found", { status: 404 })
    }
    const previewKey = previews[page - 1] || fileKey

    // Read preview
    const fileBuffer = await getStorage().read(previewKey)
    const previewName = previewKey.split("/").pop() || file.filename

    // Return file with proper content type
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename*=${encodeFilename(previewName)}`,
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
