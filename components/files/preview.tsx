"use client"

import { formatBytes } from "@/lib/utils"
import { File } from "@/prisma/client"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export function FilePreview({ file, isScanning = false }: { file: File; isScanning?: boolean }) {
  const [isEnlarged, setIsEnlarged] = useState(false)

  const fileSize =
    file.metadata && typeof file.metadata === "object" && "size" in file.metadata ? Number(file.metadata.size) : 0

  return (
    <>
      <div className="flex flex-col gap-2 p-4 overflow-hidden">
        <div className="relative aspect-[3/4] overflow-hidden rounded-md">
          <Image
            src={`/files/preview/${file.id}`}
            alt={file.filename}
            width={300}
            height={400}
            loading="lazy"
            className={`${
              isEnlarged
                ? "fixed inset-0 z-50 m-auto w-screen h-screen object-contain cursor-zoom-out"
                : "w-full h-full object-contain cursor-zoom-in"
            }`}
            onClick={() => setIsEnlarged(!isEnlarged)}
          />
          {isEnlarged && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setIsEnlarged(false)} />
          )}
          {/* Green scanning beam shown while the AI is analysing this image */}
          {isScanning && !isEnlarged && (
            <>
              <div className="pointer-events-none absolute inset-0 z-10 bg-emerald-400/10" />
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-1.5 bg-emerald-400/90 shadow-[0_0_22px_7px_rgba(52,211,153,0.85)] animate-scanline" />
            </>
          )}
        </div>
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
