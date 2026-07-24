"use client"

import { formatBytes } from "@/lib/utils"
import { File } from "@/prisma/client"
import { FileText } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export function FilePreview({
  file,
  isScanning = false,
  pageCount = 1,
}: {
  file: File
  isScanning?: boolean
  pageCount?: number
}) {
  const [enlargedPage, setEnlargedPage] = useState<number | null>(null)
  // Track render failures per page; if a page's preview fails (e.g. serverless PDF
  // rendering), show a clean placeholder instead of a blank/broken image.
  const [failedPages, setFailedPages] = useState<Record<number, boolean>>({})

  const fileSize =
    file.metadata && typeof file.metadata === "object" && "size" in file.metadata ? Number(file.metadata.size) : 0

  const pages = Array.from({ length: Math.max(1, pageCount) }, (_, i) => i + 1)

  return (
    <>
      <div className="flex flex-col gap-2 p-4 overflow-hidden">
        {pages.map((page) => {
          const isEnlarged = enlargedPage === page
          // Page 1 keeps its bare URL so existing cached previews still hit.
          const src = page === 1 ? `/files/preview/${file.id}` : `/files/preview/${file.id}?page=${page}`
          return (
            <div key={page} className="relative aspect-[3/4] overflow-hidden rounded-md">
              {failedPages[page] ? (
                <Link
                  href={`/files/download/${file.id}`}
                  className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/40 text-muted-foreground"
                >
                  <FileText className="h-16 w-16" strokeWidth={1.25} />
                  <span className="text-sm">Open {file.mimetype === "application/pdf" ? "PDF" : "file"}</span>
                </Link>
              ) : (
                <Image
                  src={src}
                  alt={pageCount > 1 ? `${file.filename} — page ${page}` : file.filename}
                  width={300}
                  height={400}
                  loading="lazy"
                  onError={() => setFailedPages((prev) => ({ ...prev, [page]: true }))}
                  className={`${
                    isEnlarged
                      ? "fixed inset-0 z-50 m-auto w-screen h-screen object-contain cursor-zoom-out"
                      : "w-full h-full object-contain cursor-zoom-in"
                  }`}
                  onClick={() => setEnlargedPage(isEnlarged ? null : page)}
                />
              )}
              {isEnlarged && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setEnlargedPage(null)} />
              )}
              {/* Page number badge for multi-page documents */}
              {pageCount > 1 && !isEnlarged && (
                <span className="pointer-events-none absolute bottom-1 right-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                  {page}/{pageCount}
                </span>
              )}
              {/* Green scanning beam shown while the AI is analysing this image */}
              {isScanning && !isEnlarged && page === 1 && (
                <>
                  <div className="pointer-events-none absolute inset-0 z-10 bg-emerald-400/10" />
                  <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-1.5 bg-emerald-400/90 shadow-[0_0_22px_7px_rgba(52,211,153,0.85)] animate-scanline" />
                </>
              )}
            </div>
          )
        })}
        <div className="flex flex-col gap-2 mt-2 overflow-hidden">
          <h2 className="text-md underline font-semibold overflow-ellipsis">
            <Link href={`/files/download/${file.id}`}>{file.filename}</Link>
          </h2>
          <p className="text-sm overflow-ellipsis">
            <strong>Type:</strong> {file.mimetype}
          </p>
          {/* <p className="text-sm overflow-ellipsis">
            <strong>Uploaded:</strong> {format(file.createdAt, "MMM d, yyyy")}
          </p> */}
          <p className="text-sm">
            <strong>Size:</strong> {formatBytes(fileSize)}
          </p>
        </div>
      </div>
    </>
  )
}
