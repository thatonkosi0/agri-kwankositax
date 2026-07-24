"use client"

import * as pdfjsLib from "pdfjs-dist"

// Render PDFs in the browser, where fonts and canvas exist natively — real bank
// statements render reliably here, unlike serverless pdf.js/canvas. The worker is
// served as a static file from /public (copied from pdfjs-dist), so its version
// always matches the bundled pdf.js API.
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

export type PdfDocument = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>

// Two text items are treated as being on the same visual line when their
// baselines are within this many PDF units of each other.
const LINE_TOLERANCE = 3

export async function loadPdfDocument(file: File): Promise<PdfDocument> {
  const data = new Uint8Array(await file.arrayBuffer())
  return await pdfjsLib.getDocument({ data }).promise
}

// Extracts a page's text with pdf.js, reconstructing the visual lines so tabular
// statements stay readable: items are grouped into lines by their y position and
// ordered left-to-right within each line. Text-based PDFs extract in the browser
// (where the pdf.js text layer works) and are tiny to analyze — far faster and
// more reliable than rendering the page to an image and reading it with vision.
// Returns "" for a page with no text layer (e.g. a scanned/image-only PDF).
export async function extractPageText(pdf: PdfDocument, pageNumber: number): Promise<string> {
  const page = await pdf.getPage(pageNumber)
  const content = await page.getTextContent()
  page.cleanup()

  type Fragment = { str: string; x: number; y: number }
  const fragments: Fragment[] = []
  for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
    if (typeof item.str !== "string" || item.str.length === 0 || !item.transform) continue
    fragments.push({ str: item.str, x: item.transform[4], y: item.transform[5] })
  }
  if (fragments.length === 0) return ""

  // pdf.js y grows upward, so a higher y is higher on the page. Sort top-to-bottom
  // then left-to-right, so same-line fragments end up adjacent and in reading order.
  fragments.sort((a, b) => b.y - a.y || a.x - b.x)

  const lines: Fragment[][] = []
  for (const fragment of fragments) {
    const current = lines[lines.length - 1]
    if (current && Math.abs(current[0].y - fragment.y) <= LINE_TOLERANCE) {
      current.push(fragment)
    } else {
      lines.push([fragment])
    }
  }

  return lines
    .map((line) =>
      line
        .map((fragment) => fragment.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((line) => line.length > 0)
    .join("\n")
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
