"use client"

import * as pdfjsLib from "pdfjs-dist"

// Render PDFs in the browser, where fonts and canvas exist natively — real bank
// statements render reliably here, unlike serverless pdf.js/canvas. The worker is
// served as a static file from /public (copied from pdfjs-dist), so its version
// always matches the bundled pdf.js API.
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

export type RenderedImage = { contentType: string; base64: string }

export type PdfDocument = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>

// A tall page holds too many transactions for one AI call to finish inside the
// serverless time limit, so pages are sliced into overlapping vertical strips.
const MAX_STRIP_HEIGHT = 1100
const STRIP_OVERLAP = 170

export async function loadPdfDocument(file: File): Promise<PdfDocument> {
  const data = new Uint8Array(await file.arrayBuffer())
  return await pdfjsLib.getDocument({ data }).promise
}

function canvasToImage(canvas: HTMLCanvasElement): RenderedImage {
  // webp is well supported in modern browsers; fall back to png if not.
  let dataUrl = canvas.toDataURL("image/webp", 0.85)
  let contentType = "image/webp"
  if (!dataUrl.startsWith("data:image/webp")) {
    dataUrl = canvas.toDataURL("image/png")
    contentType = "image/png"
  }
  return { contentType, base64: dataUrl.split(",")[1] }
}

// Renders a page and returns it as one or more overlapping vertical strips. The
// overlap ensures no transaction row is lost at a cut; duplicates from the
// overlap are removed when the caller merges the rows.
export async function renderPageToStrips(pdf: PdfDocument, pageNumber: number, scale = 2): Promise<RenderedImage[]> {
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

  const width = canvas.width
  const height = canvas.height
  if (height <= MAX_STRIP_HEIGHT) {
    return [canvasToImage(canvas)]
  }

  const strips: RenderedImage[] = []
  let y = 0
  while (y < height) {
    const stripHeight = Math.min(MAX_STRIP_HEIGHT, height - y)
    const stripCanvas = document.createElement("canvas")
    stripCanvas.width = width
    stripCanvas.height = stripHeight
    const stripContext = stripCanvas.getContext("2d")
    if (!stripContext) throw new Error("Could not create a canvas context")
    stripContext.drawImage(canvas, 0, y, width, stripHeight, 0, 0, width, stripHeight)
    strips.push(canvasToImage(stripCanvas))
    if (y + stripHeight >= height) break
    y += MAX_STRIP_HEIGHT - STRIP_OVERLAP
  }
  return strips
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
