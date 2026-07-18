import { User } from "@/prisma/client"
import sharp from "sharp"
import config from "./config"
import { extname, getStaticKey, isEnoughStorageToUploadFile } from "./files"
import { getStorage } from "./storage"

export async function uploadStaticImage(
  user: User,
  file: File,
  saveFileName: string,
  maxWidth: number = config.upload.images.maxWidth,
  maxHeight: number = config.upload.images.maxHeight,
  quality: number = config.upload.images.quality
): Promise<string> {
  if (!isEnoughStorageToUploadFile(user, file.size)) {
    throw Error("Not enough space to upload the file")
  }

  // Get target format from saveFileName extension
  const targetFormat = extname(saveFileName).slice(1).toLowerCase()
  if (!targetFormat) {
    throw Error("Target filename must have an extension")
  }

  const key = getStaticKey(user, saveFileName)
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const sharpInstance = sharp(buffer).rotate().resize(maxWidth, maxHeight, {
    fit: "inside",
    withoutEnlargement: true,
  })

  // Convert to the requested format as a buffer, then hand off to storage.
  let output: Buffer
  let contentType: string
  switch (targetFormat) {
    case "png":
      output = await sharpInstance.png().toBuffer()
      contentType = "image/png"
      break
    case "jpg":
    case "jpeg":
      output = await sharpInstance.jpeg({ quality }).toBuffer()
      contentType = "image/jpeg"
      break
    case "webp":
      output = await sharpInstance.webp({ quality }).toBuffer()
      contentType = "image/webp"
      break
    case "avif":
      output = await sharpInstance.avif({ quality }).toBuffer()
      contentType = "image/avif"
      break
    default:
      throw Error(`Unsupported target format: ${targetFormat}`)
  }

  await getStorage().write(key, output, contentType)

  return key
}
