import { addProjectAction, deleteProjectAction, editProjectAction } from "@/app/(app)/settings/actions"
import { CrudTable } from "@/components/settings/crud"
import { getCurrentUser } from "@/lib/auth"
import { randomHexColor } from "@/lib/utils"
import { getAllProjects } from "@/models/projects"
import { Prisma } from "@/prisma/client"
import { redirect } from "next/navigation"
import { ProjectMembersManager } from "@/components/settings/project-members"

export default async function ProjectsSettingsPage() {
  const user = await getCurrentUser()
  if (!user.isAdmin) {
    redirect("/settings")
  }

  const projects = await getAllProjects()
  const projectsWithActions = projects.map((project) => ({
    ...project,
    isEditable: true,
    isDeletable: true,
  }))

  return (
    <div className="container space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-2">Projects</h1>
        <p className="text-sm text-gray-500 mb-6 max-w-prose">
          Projects are shared cooperative workspaces. Create a project here, then assign members below — every assigned
          member can see and add receipts and transactions in that project.
        </p>
        <CrudTable
          items={projectsWithActions}
          columns={[
            { key: "name", label: "Name", editable: true },
            { key: "llm_prompt", label: "LLM Prompt", editable: true },
            { key: "color", label: "Color", type: "color", defaultValue: randomHexColor(), editable: true },
          ]}
          onDelete={async (code) => {
            "use server"
            return await deleteProjectAction(code)
          }}
          onAdd={async (data) => {
            "use server"
            return await addProjectAction(data as Prisma.ProjectCreateInput)
          }}
          onEdit={async (code, data) => {
            "use server"
            return await editProjectAction(code, data as Prisma.ProjectUpdateInput)
          }}
        />
      </div>

      <ProjectMembersManager />
    </div>
  )
}
