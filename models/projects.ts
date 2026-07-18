import { prisma } from "@/lib/db"
import { codeFromName } from "@/lib/utils"
import { Prisma } from "@/prisma/client"
import { cache } from "react"

export type ProjectData = {
  [key: string]: unknown
}

// Projects a user is allowed to see: admins see every org project; members see
// only the projects they've been assigned to.
export const getProjects = cache(async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (user?.isAdmin) {
    return prisma.project.findMany({ orderBy: { name: "asc" } })
  }
  return prisma.project.findMany({
    where: { members: { some: { userId } } },
    orderBy: { name: "asc" },
  })
})

// Every org project (admin management / assignment UI).
export const getAllProjects = cache(async () => {
  return prisma.project.findMany({ orderBy: { name: "asc" } })
})

export const getProjectByCode = cache(async (code: string) => {
  return prisma.project.findUnique({ where: { code } })
})

// Codes of the projects a user is assigned to (drives shared-ledger visibility).
export const getAssignedProjectCodes = cache(async (userId: string): Promise<string[]> => {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { project: { select: { code: true } } },
  })
  return memberships.map((m) => m.project.code)
})

export const createProject = async (creatorUserId: string, project: ProjectData) => {
  if (!project.code) {
    project.code = codeFromName(project.name as string)
  }
  return prisma.project.create({
    data: {
      ...project,
      user: { connect: { id: creatorUserId } },
    } as Prisma.ProjectCreateInput,
  })
}

export const updateProject = async (code: string, project: ProjectData) => {
  return prisma.project.update({ where: { code }, data: project })
}

export const deleteProject = async (code: string) => {
  // Detach any transactions from the project (they fall back to personal space).
  await prisma.transaction.updateMany({ where: { projectCode: code }, data: { projectCode: null } })
  return prisma.project.delete({ where: { code } })
}

// --- Membership (admins assign members to projects) ---

export const getProjectMembers = cache(async (projectId: string) => {
  return prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, email: true, name: true } } },
  })
})

export const getProjectMemberUserIds = cache(async (projectId: string): Promise<string[]> => {
  const members = await prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } })
  return members.map((m) => m.userId)
})

// Replace a project's member list with the given set of user ids.
export const setProjectMembers = async (projectId: string, userIds: string[]) => {
  const unique = Array.from(new Set(userIds))
  await prisma.projectMember.deleteMany({
    where: { projectId, userId: { notIn: unique.length ? unique : ["00000000-0000-0000-0000-000000000000"] } },
  })
  for (const userId of unique) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: {},
      create: { projectId, userId },
    })
  }
}
