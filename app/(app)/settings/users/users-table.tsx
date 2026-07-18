"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { approveUserAction, deleteUserAction, revokeUserAction } from "./actions"

export interface UserRow {
  id: string
  email: string
  name: string
  isApproved: boolean
  isAdmin: boolean
  createdAt: string
}

export function UsersTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  const run = (userId: string, action: () => Promise<{ success: boolean; error?: string }>) => {
    setBusyId(userId)
    startTransition(async () => {
      try {
        const result = await action()
        if (!result.success) {
          alert(result.error || "Action failed")
        } else {
          router.refresh()
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : "Action failed")
      } finally {
        setBusyId(null)
      }
    })
  }

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No users yet.</p>
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Joined</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((user) => {
            const isSelf = user.id === currentUserId
            const disabled = isPending && busyId === user.id
            return (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{user.email}</div>
                  {user.name && user.name !== user.email.split("@")[0] && (
                    <div className="text-xs text-muted-foreground">{user.name}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {user.isAdmin ? (
                    <Badge>Admin</Badge>
                  ) : user.isApproved ? (
                    <Badge variant="secondary">Approved</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Pending
                    </Badge>
                  )}
                  {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {!user.isApproved && (
                      <Button size="sm" disabled={disabled} onClick={() => run(user.id, () => approveUserAction(user.id))}>
                        Approve
                      </Button>
                    )}
                    {user.isApproved && !user.isAdmin && !isSelf && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                        onClick={() => run(user.id, () => revokeUserAction(user.id))}
                      >
                        Revoke
                      </Button>
                    )}
                    {!isSelf && !user.isAdmin && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={disabled}
                        onClick={() => {
                          if (confirm(`Delete ${user.email}? This removes their account and all their data.`)) {
                            run(user.id, () => deleteUserAction(user.id))
                          }
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
