"use client"

import * as pdfjsLib from "pdfjs-dist"

// Render PDFs in the browser, where fonts and canvas exist natively — real bank
// statements render reliably here, unlike serverless pdf.js/canvas. The worker is
// served as a static file from /public (copied from pdfjs-dist at build time), so
// its version always matches the bundled pdf.js API.
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

export type RenderedImage = { contentType: string; base64: string }

export type PdfDocument = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>

export async function loadPdfDocument(file: File): Promise<PdfDocument> {
  const data = new Uint8Array(await file.arrayBuffer())
  return await pdfjsLib.getDocument({ data }).promise
}

// Renders a single page to a webp image (base64, no data-URL prefix). A scale of
// ~2 gives crisp text for the model to read without oversized payloads.
export async function renderPageToImage(pdf: PdfDocument, pageNumber: number, scale = 2): Promise<RenderedImage> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement("canvas")
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Could not create a canvas context")

  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: context,
    viewport,
  }).promise
  page.cleanup()

  // webp is well supported in modern browsers; fall back to png if not.
  let dataUrl = canvas.toDataURL("image/webp", 0.85)
  let contentType = "image/webp"
  if (!dataUrl.startsWith("data:image/webp")) {
    dataUrl = canvas.toDataURL("image/png")
    contentType = "image/png"
  }
  return { contentType, base64: dataUrl.split(",")[1] }
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  let binary = ""
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
