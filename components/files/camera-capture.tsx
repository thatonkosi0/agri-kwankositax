"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, Loader2, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { FormError } from "../forms/error"

// A cross-device "take a photo" dialog. On laptops/desktops it uses the webcam
// via getUserMedia; on phones it prefers the rear camera. If the live camera
// isn't available (no permission / unsupported / insecure context) it falls
// back to the native file picker with `capture`, which opens the camera app on
// mobile. The captured image is handed back to the caller as a File.
export function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (file: File) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fallbackInputRef = useRef<HTMLInputElement>(null)

  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startStream = useCallback(async () => {
    setError(null)
    setSnapshot(null)
    setIsStarting(true)
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Live camera isn't available here. Use the option below to take a photo instead.")
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch (err) {
      const message =
        err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError")
          ? "Camera access was blocked. Allow camera permission, or take a photo with your device below."
          : err instanceof Error
            ? err.message
            : "Unable to access the camera"
      setError(message)
      stopStream()
    } finally {
      setIsStarting(false)
    }
  }, [stopStream])

  useEffect(() => {
    if (open) {
      startStream()
    }
    return () => {
      stopStream()
    }
  }, [open, startStream, stopStream])

  const takePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setError("The camera isn't ready yet. Give it a moment and try again.")
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setSnapshot(canvas.toDataURL("image/jpeg", 0.92))
    stopStream() // freeze the preview after capturing
  }

  const usePhoto = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not process the photo. Please try again.")
          return
        }
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" })
        onCapture(file)
        onOpenChange(false)
      },
      "image/jpeg",
      0.92
    )
  }

  const handleFallbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onCapture(file)
      onOpenChange(false)
    }
    e.target.value = ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Take a photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {snapshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={snapshot} alt="Captured photo" className="w-full h-full object-contain" />
            ) : (
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            )}
            {isStarting && !snapshot && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {error && (
            <div className="w-full flex flex-col items-center gap-2">
              <FormError className="text-center">{error}</FormError>
              <input
                ref={fallbackInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFallbackChange}
              />
              <Button type="button" variant="secondary" onClick={() => fallbackInputRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />
                Take a photo with your device
              </Button>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        <DialogFooter>
          {snapshot ? (
            <>
              <Button type="button" variant="outline" onClick={startStream}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button type="button" onClick={usePhoto}>
                Use photo
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={takePhoto} disabled={isStarting || !!error}>
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
