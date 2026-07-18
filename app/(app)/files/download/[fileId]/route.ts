import { getCurrentUser } from "@/lib/auth"
import { fileExists, fullKeyForFile } from "@/lib/files"
import { getStorage } from "@/lib/storage"
import { encodeFilename } from "@/lib/utils"
import { getVisibleFileById } from "@/models/files"
import { getUserById } from "@/models/users"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params
  const user = await getCurrentUser()

  if (!fileId) {
    return new NextResponse("No fileId provided", { status: 400 })
  }

  try {
    // Find file (own, admin, or shared via an assigned project)
    const file = await getVisibleFileById(fileId, user.id)
    if (!file) {
      return new NextResponse("File not found or not accessible", { status: 404 })
    }

    // Storage is scoped to the file's OWNER, which may be another member.
    const owner = file.userId === user.id ? user : await getUserById(file.userId)
    if (!owner) {
      return new NextResponse("File owner not found", { status: 404 })
    }

    const fileKey = fullKeyForFile(owner, file)
    const isFileExists = await fileExists(fileKey)
    if (!isFileExists) {
      return new NextResponse(`File not found in storage: ${file.path}`, { status: 404 })
    }

    // Read file
    const fileBuffer = await getStorage().read(fileKey)

    // Return file with proper content type and encoded filename
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": file.mimetype,
        "Content-Disposition": `attachment; filename*=${encodeFilename(file.filename)}`,
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
