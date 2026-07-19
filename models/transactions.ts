import { prisma } from "@/lib/db"
import { Field, Prisma, Transaction } from "@/prisma/client"
import { cache } from "react"
import { getFields } from "./fields"
import { deleteFile } from "./files"
import { getAssignedProjectCodes } from "./projects"

// Read visibility for transactions: admins see everything; members see their own
// transactions plus any transaction in a project they're assigned to (shared ledger).
export const getTransactionVisibility = cache(async (userId: string): Promise<Prisma.TransactionWhereInput> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  if (user?.isAdmin) {
    return {}
  }
  const assignedCodes = await getAssignedProjectCodes(userId)
  if (assignedCodes.length === 0) {
    return { userId }
  }
  return { OR: [{ userId }, { projectCode: { in: assignedCodes } }] }
})

export type TransactionData = {
  name?: string | null
  description?: string | null
  merchant?: string | null
  total?: number | null
  currencyCode?: string | null
  convertedTotal?: number | null
  convertedCurrencyCode?: string | null
  type?: string | null
  items?: TransactionData[] | undefined
  note?: string | null
  files?: string[] | undefined
  extra?: Record<string, unknown>
  categoryCode?: string | null
  projectCode?: string | null
  issuedAt?: Date | string | null
  // Receivable tracking columns. These are not part of the user-defined Field
  // registry, so they bypass the extra-field split and are written explicitly.
  status?: string | null
  dueDate?: Date | string | null
  paidAt?: Date | string | null
  text?: string | null
  [key: string]: unknown
}

// Extract the receivable-tracking system columns from transaction data. These
// live on the Transaction table directly (not in `extra` and not in the Field
// registry), so they must be passed through create/update explicitly.
const receivableColumns = (data: TransactionData) => {
  const cols: { status?: string | null; dueDate?: Date | null; paidAt?: Date | null } = {}
  if (data.status !== undefined) cols.status = (data.status as string | null) ?? null
  if (data.dueDate !== undefined) cols.dueDate = data.dueDate ? new Date(data.dueDate as string | Date) : null
  if (data.paidAt !== undefined) cols.paidAt = data.paidAt ? new Date(data.paidAt as string | Date) : null
  return cols
}

export type TransactionFilters = {
  search?: string
  dateFrom?: string
  dateTo?: string
  ordering?: string
  categoryCode?: string
  projectCode?: string
  type?: string
  page?: number
}

export type TransactionPagination = {
  limit: number
  offset: number
}

export const getTransactions = cache(
  async (
    userId: string,
    filters?: TransactionFilters,
    pagination?: TransactionPagination
  ): Promise<{
    transactions: Transaction[]
    total: number
  }> => {
    const where: Prisma.TransactionWhereInput = {}
    const and: Prisma.TransactionWhereInput[] = [await getTransactionVisibility(userId)]
    let orderBy: Prisma.TransactionOrderByWithRelationInput = { issuedAt: "desc" }

    if (filters) {
      if (filters.search) {
        and.push({
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { merchant: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
            { note: { contains: filters.search, mode: "insensitive" } },
            { text: { contains: filters.search, mode: "insensitive" } },
          ],
        })
      }

      if (filters.dateFrom || filters.dateTo) {
        where.issuedAt = {
          gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
        }
      }

      if (filters.categoryCode) {
        where.categoryCode = filters.categoryCode
      }

      if (filters.projectCode) {
        where.projectCode = filters.projectCode
      }

      if (filters.type) {
        where.type = filters.type
      }

      if (filters.ordering) {
        const isDesc = filters.ordering.startsWith("-")
        const field = isDesc ? filters.ordering.slice(1) : filters.ordering
        orderBy = { [field]: isDesc ? "desc" : "asc" }
      }
    }

    where.AND = and

    if (pagination) {
      const total = await prisma.transaction.count({ where })
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          category: true,
          project: true,
        },
        orderBy,
        take: pagination?.limit,
        skip: pagination?.offset,
      })
      return { transactions, total }
    } else {
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          category: true,
          project: true,
        },
        orderBy,
      })
      return { transactions, total: transactions.length }
    }
  }
)

export const getTransactionById = cache(async (id: string, userId: string): Promise<Transaction | null> => {
  const visibility = await getTransactionVisibility(userId)
  return await prisma.transaction.findFirst({
    where: { AND: [{ id }, visibility] },
    include: {
      category: true,
      project: true,
    },
  })
})

export const getTransactionsByFileId = cache(async (fileId: string, userId: string): Promise<Transaction[]> => {
  return await prisma.transaction.findMany({
    where: { files: { array_contains: [fileId] }, userId },
  })
})

// --- 1. New Dedicated Deduplication Function ---
export const findDuplicateTransaction = async (userId: string, data: TransactionData) => {
  const { standard } = await splitTransactionDataExtraFields(data, userId)
  const currencyCode = standard.currencyCode || "USD"

  if (standard.total && standard.merchant && standard.issuedAt) {
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        userId: userId,
        total: standard.total,
        merchant: standard.merchant,
        issuedAt: standard.issuedAt,
        currencyCode: currencyCode,
      },
    })

    return existingTransaction
  }

  return null
}

export const createTransaction = async (userId: string, data: TransactionData): Promise<Transaction> => {
  const { standard, extra } = await splitTransactionDataExtraFields(data, userId)

  const newTransaction = await prisma.transaction.create({
    data: {
      ...standard,
      ...receivableColumns(data),
      extra: extra,
      items: data.items as Prisma.InputJsonValue,
      userId,
    },
  })

  return newTransaction
}

export const updateTransaction = async (id: string, userId: string, data: TransactionData): Promise<Transaction> => {
  // Collaborative: allow editing any transaction the user can see (own or in an assigned project).
  const existing = await getTransactionById(id, userId)
  if (!existing) {
    throw new Error("Transaction not found or not accessible")
  }
  const { standard, extra } = await splitTransactionDataExtraFields(data, userId)

  return await prisma.transaction.update({
    where: { id },
    data: {
      ...standard,
      ...receivableColumns(data),
      extra: extra,
      items: data.items ? (data.items as Prisma.InputJsonValue) : [],
    },
  })
}

// Toggle an invoice's paid/unpaid state. Setting paid stamps paidAt (used by the
// cash-basis VAT report); reverting to unpaid clears it.
export const setTransactionPaidStatus = async (
  id: string,
  userId: string,
  paid: boolean
): Promise<Transaction> => {
  const existing = await getTransactionById(id, userId)
  if (!existing) {
    throw new Error("Transaction not found or not accessible")
  }
  return await prisma.transaction.update({
    where: { id },
    data: paid ? { status: "paid", paidAt: new Date() } : { status: "unpaid", paidAt: null },
  })
}

export const updateTransactionFiles = async (id: string, userId: string, files: string[]): Promise<Transaction> => {
  const existing = await getTransactionById(id, userId)
  if (!existing) {
    throw new Error("Transaction not found or not accessible")
  }
  return await prisma.transaction.update({
    where: { id },
    data: { files },
  })
}

export const deleteTransaction = async (id: string, userId: string): Promise<Transaction | undefined> => {
  const transaction = await getTransactionById(id, userId)

  if (transaction) {
    // File cleanup runs against the transaction's OWNER (files/storage are owner-scoped).
    const ownerId = transaction.userId
    const files = Array.isArray(transaction.files) ? transaction.files : []

    for (const fileId of files as string[]) {
      if ((await getTransactionsByFileId(fileId, ownerId)).length <= 1) {
        await deleteFile(fileId, ownerId)
      }
    }

    return await prisma.transaction.delete({
      where: { id },
    })
  }
}

export const bulkDeleteTransactions = async (ids: string[], userId: string) => {
  const visibility = await getTransactionVisibility(userId)
  return await prisma.transaction.deleteMany({
    where: { AND: [{ id: { in: ids } }, visibility] },
  })
}

const splitTransactionDataExtraFields = async (
  data: TransactionData,
  userId: string
): Promise<{ standard: TransactionData; extra: Prisma.InputJsonValue }> => {
  const fields = await getFields(userId)
  const fieldMap = fields.reduce(
    (acc, field) => {
      acc[field.code] = field
      return acc
    },
    {} as Record<string, Field>
  )

  const standard: TransactionData = {}
  const extra: Record<string, unknown> = {}

  Object.entries(data).forEach(([key, value]) => {
    const fieldDef = fieldMap[key]
    if (fieldDef) {
      if (fieldDef.isExtra) {
        extra[key] = value
      } else {
        standard[key] = value
      }
    }
  })

  return { standard, extra: extra as Prisma.InputJsonValue }
}
