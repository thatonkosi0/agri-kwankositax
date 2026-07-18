"use server"

import { getCurrentUser } from "@/lib/auth"
import { deleteUserById, updateUser } from "@/models/users"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user.isAdmin) {
    throw new Error("Not authorized")
  }
  return user
}

export async function approveUserAction(userId: string) {
  await requireAdmin()
  await updateUser(userId, { isApproved: true })
  revalidatePath("/settings/users")
  return { success: true }
}

export async function revokeUserAction(userId: string) {
  const admin = await requireAdmin()
  if (admin.id === userId) {
    return { success: false, error: "You cannot revoke your own access" }
  }
  await updateUser(userId, { isApproved: false })
  revalidatePath("/settings/users")
  return { success: true }
}

export async function deleteUserAction(userId: string) {
  const admin = await requireAdmin()
  if (admin.id === userId) {
    return { success: false, error: "You cannot delete your own account" }
  }
  await deleteUserById(userId)
  revalidatePath("/settings/users")
  return { success: true }
}
