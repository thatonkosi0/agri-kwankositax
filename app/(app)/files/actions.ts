"use server"

import { ActionState } from "@/lib/actions"
import { getCurrentUser, isSubscriptionExpired } from "@/lib/auth"
import {
  getUserStorageUsed,
  isEnoughStorageToUploadFile,
  storageKey,
  unsortedFilePath,
} from "@/lib/files"
import { getStorage } from "@/lib/storage"
import { createFile } from "@/models/files"
import { updateUser } from "@/models/users"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

export async function uploadFilesAction(formData: FormData): Promise<ActionState<null>> {
  try {
    const user = await getCurrentUser()
    const files = formData.getAll("files") as File[]
    const storage = getStorage()

    // Check limits
    const totalFileSize = files.reduce((acc, file) => acc + file.size, 0)
    if (!isEnoughStorageToUploadFile(user, totalFileSize)) {
      return { success: false, error: `Insufficient storage to upload these files` }
    }

    if (isSubscriptionExpired(user)) {
      return {
        success: false,
        error: "Your subscription has expired, please upgrade your account or buy new subscription plan",
      }
    }

    // Process each file
    await Promise.all(
      files.map(async (file) => {
        if (!(file instanceof File)) {
          throw new Error("Invalid file")
        }

        // Save file to storage
        const fileUuid = randomUUID()
        const relativeFilePath = unsortedFilePath(fileUuid, file.name)
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        await storage.write(storageKey(user, relativeFilePath), buffer, file.type)

        // Create file record in database
        await createFile(user.id, {
          id: fileUuid,
          filename: file.name,
          path: relativeFilePath,
          mimetype: file.type,
          metadata: {
            size: file.size,
            lastModified: file.lastModified,
          },
        })
      })
    )

    const storageUsed = await getUserStorageUsed(user)
    await updateUser(user.id, { storageUsed })

    revalidatePath("/unsorted")

    return { success: true, error: null }
  } catch (error) {
    // Surface the real cause instead of crashing to the error boundary.
    console.error("uploadFilesAction failed:", error)
    return { success: false, error: `Failed to upload: ${error instanceof Error ? error.message : String(error)}` }
  }
}
