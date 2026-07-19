"use server"

import { basenameNoExt, fileExists, getUserPreviewsScope, joinKey } from "@/lib/files"
import { getStorage } from "@/lib/storage"
import { User } from "@/prisma/client"
import { createCanvas } from "@napi-rs/canvas"
import sharp from "sharp"
import config from "../config"

// Rasterizes a PDF held in memory to webp page images (base64), without touching
// storage. Used by bank-statement analysis: sending rendered page images lets the
// model *see* the statement, which reads tabular transactions far more reliably
// than handing it the raw PDF.
export async function rasterizePdfBufferToImages(
  bytes: Buffer,
  maxPages: number = config.upload.pdfs.maxPages
): Promise<{ contentType: string; base64: string }[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true })
  const doc = await loadingTask.promise

  const dpiScale = config.upload.pdfs.dpi / 72
  const pageCount = Math.min(doc.numPages, maxPages)
  const images: { contentType: string; base64: string }[] = []

  try {
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i)
      const baseViewport = page.getViewport({ scale: 1 })
      const maxScale = Math.min(
        config.upload.pdfs.maxWidth / baseViewport.width,
        config.upload.pdfs.maxHeight / baseViewport.height
      )
      const scale = Math.min(dpiScale, maxScale) || 1
      const viewport = page.getViewport({ scale })

      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const context = canvas.getContext("2d")
      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise

      const png = canvas.toBuffer("image/png")
      const webp = await sharp(png).webp({ quality: config.upload.pdfs.quality }).toBuffer()
      images.push({ contentType: "image/webp", base64: webp.toString("base64") })
      page.cleanup()
    }
  } finally {
    await loadingTask.destroy()
  }

  return images
}

// Renders PDF pages to webp previews using pdf.js + a serverless-friendly
// native canvas (no GraphicsMagick/Ghostscript system binaries required, so it
// works on Vercel). Rendered pages are stored via the storage backend.
export async function pdfToImages(
  user: User,
  origKey: string
): Promise<{ contentType: string; pages: string[] }> {
  const storage = getStorage()
  const previewsScope = getUserPreviewsScope(user)
  const basename = basenameNoExt(origKey)

  // Reuse already-rendered pages if present.
  const existingPages: string[] = []
  for (let i = 1; i <= config.upload.pdfs.maxPages; i++) {
    const pageKey = joinKey(previewsScope, `${basename}.${i}.webp`)
    if (await fileExists(pageKey)) {
      existingPages.push(pageKey)
    } else {
      break
    }
  }
  if (existingPages.length > 0) {
    return { contentType: "image/webp", pages: existingPages }
  }

  // pdf.js legacy build is the CommonJS/Node-compatible variant.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")

  const data = new Uint8Array(await storage.read(origKey))
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
  })
  const doc = await loadingTask.promise

  // Scale so the rendered raster is roughly the configured DPI (1.0 = 72 DPI),
  // capped so a page never exceeds the configured max dimensions.
  const dpiScale = config.upload.pdfs.dpi / 72

  const pageKeys: string[] = []
  const pageCount = Math.min(doc.numPages, config.upload.pdfs.maxPages)

  try {
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i)
      const baseViewport = page.getViewport({ scale: 1 })
      const maxScale = Math.min(
        config.upload.pdfs.maxWidth / baseViewport.width,
        config.upload.pdfs.maxHeight / baseViewport.height
      )
      const scale = Math.min(dpiScale, maxScale) || 1
      const viewport = page.getViewport({ scale })

      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const context = canvas.getContext("2d")

      // @napi-rs/canvas's canvas/context are runtime-compatible with pdf.js's
      // 2D canvas API, but their types differ from the DOM lib types.
      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise

      const png = canvas.toBuffer("image/png")
      const webp = await sharp(png).webp({ quality: config.upload.pdfs.quality }).toBuffer()

      const pageKey = joinKey(previewsScope, `${basename}.${i}.webp`)
      await storage.write(pageKey, webp, "image/webp")
      pageKeys.push(pageKey)

      page.cleanup()
    }
  } finally {
    await loadingTask.destroy()
  }

  return { contentType: "image/webp", pages: pageKeys }
}
