"use server"

import { prisma } from "@/lib/db"
import { fullKeyForFile } from "@/lib/files"
import { getStorage } from "@/lib/storage"
import { cache } from "react"
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
