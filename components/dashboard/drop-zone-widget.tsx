"use client"

import { useNotification } from "@/app/(app)/context"
import { uploadFilesAction } from "@/app/(app)/files/actions"
import { FormError } from "@/components/forms/error"
import { Button } from "@/components/ui/button"
import config from "@/lib/config"
import { Camera, Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { startTransition, useCallback, useState } from "react"
import { CameraCaptureDialog } from "@/components/files/camera-capture"

export default function DashboardDropZoneWidget() {
  const router = useRouter()
  const { showNotification } = useNotification()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [isCameraOpen, setIsCameraOpen] = useState(false)

  const uploadFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      setIsUploading(true)
      setUploadError("")

      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))

      startTransition(async () => {
        const result = await uploadFilesAction(formData)
        if (result.success) {
          showNotification({ code: "sidebar.unsorted", message: "new" })
          setTimeout(() => showNotification({ code: "sidebar.unsorted", message: "" }), 3000)
          router.push("/unsorted")
        } else {
          setUploadError(result.error ? result.error : "Something went wrong...")
        }
        setIsUploading(false)
      })
    },
    [router, showNotification]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files))
    }
    e.target.value = ""
  }

  return (
    <div className="relative flex w-full h-full">
      <label className="relative w-full h-full border-2 border-dashed rounded-lg transition-colors hover:border-primary cursor-pointer">
        <input
          type="file"
          id="fileInput"
          className="hidden"
          multiple
          accept={config.upload.acceptedMimeTypes}
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center gap-4 p-8 pb-20 text-center h-full">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <div>
            <p className="text-lg font-medium">{isUploading ? "Uploading..." : "Drop your files here or click to upload"}</p>
            {!uploadError && (
              <p className="text-sm text-muted-foreground">
                upload receipts, invoices and any other documents for me to scan
              </p>
            )}
            {uploadError && <FormError>{uploadError}</FormError>}
          </div>
        </div>
      </label>

      {/* Sibling of the label so it opens the camera instead of the file picker */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <Button type="button" variant="secondary" disabled={isUploading} onClick={() => setIsCameraOpen(true)}>
          <Camera className="mr-2 h-4 w-4" />
          Take a photo
        </Button>
      </div>

      <CameraCaptureDialog open={isCameraOpen} onOpenChange={setIsCameraOpen} onCapture={(file) => uploadFiles([file])} />
    </div>
  )
}
