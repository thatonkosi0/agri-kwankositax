"use client"

import { setProjectMembersAction } from "@/app/(app)/settings/actions"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

export function ProjectMemberEditor({
  projectId,
  projectName,
  users,
  memberIds,
}: {
  projectId: string
  projectName: string
  users: { id: string; label: string; isAdmin: boolean }[]
  memberIds: string[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set(memberIds))
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSaved(false)
  }

  const save = () => {
    setError("")
    startTransition(async () => {
      const result = await setProjectMembersAction(projectId, Array.from(selected))
      if (result.success) {
        setSaved(true)
        router.refresh()
      } else {
        setError(result.error || "Failed to save members")
      }
    })
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h3 className="font-semibold">{projectName}</h3>
        <Button size="sm" onClick={save} disabled={isPending}>
          {isPending ? "Saving..." : saved ? "Saved ✓" : "Save members"}
        </Button>
      </div>
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No members to assign yet.</p>
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(u.id)}
                onChange={() => toggle(u.id)}
                className="h-4 w-4"
              />
              <span>
                {u.label}
                {u.isAdmin && <span className="ml-1 text-xs text-muted-foreground">(admin)</span>}
              </span>
            </label>
          ))}
        </div>
      )}
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  )
}
