"use server"

import { basenameNoExt, fileExists, getUserPreviewsScope, joinKey } from "@/lib/files"
import { getStorage } from "@/lib/storage"
import { User } from "@/prisma/client"
import sharp from "sharp"
import config from "../config"

export async function resizeImage(
  user: User,
  origKey: string,
  maxWidth: number = config.upload.images.maxWidth,
  maxHeight: number = config.upload.images.maxHeight,
  quality: number = config.upload.images.quality
): Promise<{ contentType: string; resizedKey: string }> {
  try {
    const storage = getStorage()
    const basename = basenameNoExt(origKey)
    const outputKey = joinKey(getUserPreviewsScope(user), `${basename}.webp`)

    if (await fileExists(outputKey)) {
      return { contentType: "image/webp", resizedKey: outputKey }
    }

    const input = await storage.read(origKey)
    const output = await sharp(input)
      .rotate()
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer()

    await storage.write(outputKey, output, "image/webp")

    return { contentType: "image/webp", resizedKey: outputKey }
  } catch (error) {
    console.error("Error resizing image:", error)
    return { contentType: "image/unknown", resizedKey: origKey }
  }
}
