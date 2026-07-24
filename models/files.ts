"use server"

import { prisma } from "@/lib/db"
import { fullKeyForFile } from "@/lib/files"
import { getPdfPageCount } from "@/lib/pdf-split"
import { getStorage } from "@/lib/storage"
import { File, User } from "@/prisma/client"
import { cache } from "react"
import { getAssignedProjectCodes } from "./projects"
import { getTransactionById } from "./transactions"
import { getUserById } from "./users"

export const getUnsortedFiles = cache(async (userId: string) => {
  return await prisma.file.findMany({
    where: {
      isReviewed: false,
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
})

export const getUnsortedFilesCount = cache(async (userId: string) => {
  return await prisma.file.count({
    where: {
      isReviewed: false,
      userId,
    },
  })
})

export const getFileById = cache(async (id: string, userId: string) => {
  return await prisma.file.findFirst({
    where: { id, userId },
  })
})

// Returns the file if the user may view it: they own it, they're an admin, or it
// is attached to a transaction in a project they're assigned to (shared ledger).
export const getVisibleFileById = cache(async (id: string, userId: string) => {
  const file = await prisma.file.findUnique({ where: { id } })
  if (!file) return null
  if (file.userId === userId) return file

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (user?.isAdmin) return file

  const assignedCodes = await getAssignedProjectCodes(userId)
  if (assignedCodes.length === 0) return null

  const tx = await prisma.transaction.findFirst({
    where: { files: { array_contains: [id] }, projectCode: { in: assignedCodes } },
    select: { id: true },
  })
  return tx ? file : null
})

export const getFilesByTransactionId = cache(async (id: string, userId: string) => {
  const transaction = await getTransactionById(id, userId)
  if (transaction && transaction.files) {
    return await prisma.file.findMany({
      where: {
        id: {
          in: transaction.files as string[],
        },
        userId,
      },
      orderBy: {
        createdAt: "asc",
      },
    })
  }
  return []
})

export const createFile = async (userId: string, data: any) => {
  return await prisma.file.create({
    data: {
      ...data,
      userId,
    },
  })
}

export const updateFile = async (id: string, userId: string, data: any) => {
  return await prisma.file.update({
    where: { id, userId },
    data,
  })
}

// Number of preview-able pages for a file (1 for images; the real page count for
// PDFs). Cached into the file's metadata after the first read so multi-page
// previews don't re-parse the PDF on every transaction view. `owner` is the file's
// storage owner (may differ from the viewer for shared project files).
export const getFilePageCount = async (owner: User, file: File): Promise<number> => {
  if (file.mimetype !== "application/pdf") return 1

  const metadata = (file.metadata && typeof file.metadata === "object" ? file.metadata : {}) as Record<string, unknown>
  if (typeof metadata.pageCount === "number" && metadata.pageCount > 0) {
    return metadata.pageCount
  }

  try {
    const bytes = await getStorage().read(fullKeyForFile(owner, file))
    const pageCount = await getPdfPageCount(bytes)
    // Persist under the owner so the count is shared across members who view it.
    await updateFile(file.id, owner.id, { metadata: { ...metadata, pageCount } })
    return pageCount
  } catch {
    return 1 // fall back to a single page if the PDF can't be parsed
  }
}

export const deleteFile = async (id: string, userId: string) => {
  const file = await getFileById(id, userId)
  if (!file) {
    return
  }

  // Remove the stored object (scoped to the owning user). fullKeyForFile guards
  // against path traversal in the stored relative path.
  const user = await getUserById(userId)
  if (user) {
    try {
      await getStorage().remove(fullKeyForFile(user, file))
    } catch (error) {
      console.error("Error deleting file from storage:", error)
    }
  }

  return await prisma.file.delete({
    where: { id, userId },
  })
}
