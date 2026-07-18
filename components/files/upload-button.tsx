"use client"

import { useNotification } from "@/app/(app)/context"
import { uploadFilesAction } from "@/app/(app)/files/actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import config from "@/lib/config"
import { Camera, Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { ComponentProps, startTransition, useCallback, useRef, useState } from "react"
import { FormError } from "../forms/error"
import { CameraCaptureDialog } from "./camera-capture"

export function UploadButton({ children, ...props }: { children: React.ReactNode } & ComponentProps<typeof Button>) {
  const router = useRouter()
  const { showNotification } = useNotification()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)

  const uploadFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      setUploadError("")
      setIsUploading(true)

      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))

      startTransition(async () => {
        try {
          const result = await uploadFilesAction(formData)
          if (result.success) {
            showNotification({ code: "sidebar.unsorted", message: "new" })
            setTimeout(() => showNotification({ code: "sidebar.unsorted", message: "" }), 3000)
            router.push("/unsorted")
          } else {
            setUploadError(result.error ? result.error : "Something went wrong...")
          }
        } catch (error) {
          setUploadError(
            error instanceof Error ? error.message : "Upload failed — the file may be too large (max ~4MB on the server)."
          )
        } finally {
          setIsUploading(false)
        }
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
    <div>
      <input
        ref={fileInputRef}
        type="file"
        id="fileInput"
        className="hidden"
        multiple
        accept={config.upload.acceptedMimeTypes}
        onChange={handleFileChange}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={isUploading} type="button" {...props}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>{children}</>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload a file
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsCameraOpen(true)}>
            <Camera className="mr-2 h-4 w-4" />
            Take a photo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CameraCaptureDialog open={isCameraOpen} onOpenChange={setIsCameraOpen} onCapture={(file) => uploadFiles([file])} />

      {uploadError && <FormError>{uploadError}</FormError>}
    </div>
  )
}
