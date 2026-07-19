import { useState } from "react"

interface UseDownloadOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useDownload(options: UseDownloadOptions = {}) {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = async (url: string, defaultName: string) => {
    try {
      setIsDownloading(true)

      const response = await fetch(url)
      if (!response.ok) throw new Error("Download failed")

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition")
      const filename = contentDisposition ? contentDisposition.split("filename=")[1].replace(/"/g, "") : defaultName

      // Create a blob from the response
      const blob = await response.blob()

      // Create a download link and trigger it
      const downloadLink = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadLink
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Revoke on a later tick. Revoking synchronously after click() cancels the
      // download in some browsers (e.g. Edge) — the file is built but never saves.
      setTimeout(() => window.URL.revokeObjectURL(downloadLink), 30000)

      options.onSuccess?.()
    } catch (error) {
      console.error("Download error:", error)
      options.onError?.(error instanceof Error ? error : new Error("Download failed"))
    } finally {
      setIsDownloading(false)
    }
  }

  return {
    download,
    isDownloading,
  }
}
