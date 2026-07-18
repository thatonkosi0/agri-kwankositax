import { resizeImage } from "@/lib/previews/images"
import { pdfToImages } from "@/lib/previews/pdf"
import { User } from "@/prisma/client"

export async function generateFilePreviews(
  user: User,
  fileKey: string,
  mimetype: string
): Promise<{ contentType: string; previews: string[] }> {
  if (mimetype === "application/pdf") {
    const { contentType, pages } = await pdfToImages(user, fileKey)
    return { contentType, previews: pages }
  } else if (mimetype.startsWith("image/")) {
    const { contentType, resizedKey } = await resizeImage(user, fileKey)
    return { contentType, previews: [resizedKey] }
  } else {
    return { contentType: mimetype, previews: [fileKey] }
  }
}
