import { getCurrentUser } from "@/lib/auth"
import { getAllUsers } from "@/models/users"
import { redirect } from "next/navigation"
import { UsersTable } from "./users-table"

export default async function UsersSettingsPage() {
  const user = await getCurrentUser()
  if (!user.isAdmin) {
    redirect("/settings")
  }

  const users = await getAllUsers()
  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    isApproved: u.isApproved,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt.toISOString(),
  }))

  return (
    <div className="w-full space-y-6">
      <div>
        <h3 className="text-lg font-medium">Users</h3>
        <p className="text-sm text-muted-foreground">
          Approve new sign-ups and manage who can access the app. New accounts start as pending until you approve them.
        </p>
      </div>
      <UsersTable users={rows} currentUserId={user.id} />
    </div>
  )
}

export const dynamic = "force-dynamic"
