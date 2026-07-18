import { getAllProjects, getProjectMemberUserIds } from "@/models/projects"
import { getAllUsers } from "@/models/users"
import { ProjectMemberEditor } from "./project-member-editor"

export async function ProjectMembersManager() {
  const projects = await getAllProjects()
  const users = await getAllUsers()

  const userOptions = users.map((u) => ({
    id: u.id,
    label: u.name && u.name !== u.email.split("@")[0] ? `${u.name} · ${u.email}` : u.email,
    isAdmin: u.isAdmin,
  }))

  const memberIdsByProject: Record<string, string[]> = Object.fromEntries(
    await Promise.all(projects.map(async (p) => [p.id, await getProjectMemberUserIds(p.id)] as const))
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-1">Project members</h2>
        <p className="text-sm text-gray-500 max-w-prose">
          Assign members to each project. Every assigned member sees the whole project ledger and can add receipts and
          transactions to it. Admins can see all projects regardless.
        </p>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Create a project above first, then assign members here.</p>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectMemberEditor
              key={project.id}
              projectId={project.id}
              projectName={project.name}
              users={userOptions}
              memberIds={memberIdsByProject[project.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
