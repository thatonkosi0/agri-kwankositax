import { getCurrentUser } from "@/lib/auth"
import { fileExists, getStaticKey } from "@/lib/files"
import { getStorage } from "@/lib/storage"
import lookup from "mime-types"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params
  const user = await getCurrentUser()

  if (!filename) {
    return new NextResponse("No filename provided", { status: 400 })
  }

  try {
    const fileKey = getStaticKey(user, filename)
    const isFileExists = await fileExists(fileKey)
    if (!isFileExists) {
      return new NextResponse(`File not found for user: ${filename}`, { status: 404 })
    }

    const fileBuffer = await getStorage().read(fileKey)

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": lookup.lookup(filename) || "application/octet-stream",
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
