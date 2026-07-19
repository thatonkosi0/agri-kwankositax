import { PDFDocument } from "pdf-lib"

// Pure-JS PDF utilities (no native deps), safe on serverless. Used to split a
// bank statement into small page ranges so each AI request stays under the
// platform's function time limit.

export async function getPdfPageCount(bytes: Buffer | Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return doc.getPageCount()
}

// Returns a new PDF containing only pages [startPage, endPage] (1-based, inclusive).
export async function extractPdfPages(
  bytes: Buffer | Uint8Array,
  startPage: number,
  endPage: number
): Promise<Buffer> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const total = src.getPageCount()

  const from = Math.max(1, startPage)
  const to = Math.min(total, endPage)
  const indices: number[] = []
  for (let i = from - 1; i <= to - 1; i++) indices.push(i)

  const out = await PDFDocument.create()
  const pages = await out.copyPages(src, indices)
  pages.forEach((page) => out.addPage(page))
  const outBytes = await out.save()
  return Buffer.from(outBytes)
}
