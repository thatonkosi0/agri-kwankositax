import { prisma } from "@/lib/db"
import {
  amountInCurrencyCents,
  financialMonthIndex,
  financialYearLabel,
  financialYearRange,
  MONTH_NAMES,
  PeriodGranularity,
  quarterLabel,
} from "@/lib/reports"
import { getVatConfig, transactionNetCents, transactionVatCents, VatConfig } from "@/lib/vat"
import { Transaction } from "@/prisma/client"
import { cache } from "react"
import { getSettings } from "./settings"
import { getTransactionVisibility } from "./transactions"

async function reportingContext(userId: string) {
  const settings = await getSettings(userId)
  const currency = (settings.default_currency || "ZAR").toUpperCase()
  const fyStart = Number(settings.financial_year_start_month) || 1
  return { settings, currency, fyStart, vat: getVatConfig(settings) }
}

// ------------------------------------------------------------------ VAT report

export type VatPeriod = {
  key: string
  label: string
  outputVatCents: number // VAT collected on income (sales)
  inputVatCents: number // VAT paid on expenses (purchases)
  netVatCents: number // output - input (positive = payable to SARS)
  incomeBaseCents: number
  expenseBaseCents: number
}

export type VatReport = {
  currency: string
  year: number
  yearLabel: string
  granularity: PeriodGranularity
  basis: "accrual" | "cash"
  periods: VatPeriod[]
  totals: Omit<VatPeriod, "key" | "label">
}

// For cash basis, VAT is recognised when money changes hands. We approximate
// that with paidAt when present, and exclude income invoices still marked unpaid.
function recognitionDate(t: Transaction, basis: "accrual" | "cash"): Date | null {
  if (basis === "cash") {
    return t.paidAt ?? t.issuedAt ?? null
  }
  return t.issuedAt ?? null
}

function isExcludedByCashBasis(t: Transaction, basis: "accrual" | "cash"): boolean {
  if (basis !== "cash") return false
  // Income not yet received doesn't count as output VAT under cash basis.
  return t.type === "income" && (t.status === "unpaid" || t.status === "overdue")
}

export const getVatReport = cache(
  async (
    userId: string,
    year: number,
    granularity: PeriodGranularity = "quarter",
    basisOverride?: "accrual" | "cash"
  ): Promise<VatReport> => {
    const { currency, fyStart, vat } = await reportingContext(userId)
    const basis = basisOverride ?? vat.basis
    const { from, to } = financialYearRange(year, fyStart)

    const transactions = await prisma.transaction.findMany({
      where: {
        AND: [
          await getTransactionVisibility(userId),
          { OR: [{ issuedAt: { gte: from, lt: to } }, { paidAt: { gte: from, lt: to } }] },
        ],
      },
    })

    const config: VatConfig = vat
    const bucketCount = granularity === "month" ? 12 : 4
    const periods: VatPeriod[] = Array.from({ length: bucketCount }, (_, i) => ({
      key: granularity === "month" ? MONTH_NAMES[(fyStart - 1 + i) % 12] : `Q${i + 1}`,
      label:
        granularity === "month"
          ? MONTH_NAMES[(fyStart - 1 + i) % 12]
          : `Q${i + 1}`,
      outputVatCents: 0,
      inputVatCents: 0,
      netVatCents: 0,
      incomeBaseCents: 0,
      expenseBaseCents: 0,
    }))

    for (const t of transactions) {
      if (isExcludedByCashBasis(t, basis)) continue
      const date = recognitionDate(t, basis)
      if (!date || date < from || date >= to) continue
      if (amountInCurrencyCents(t, currency) === null) continue // only report the reporting currency

      const monthIdx = financialMonthIndex(date, fyStart)
      const bucket = granularity === "month" ? monthIdx : Math.floor(monthIdx / 3)
      const period = periods[bucket]

      const vatCents = transactionVatCents(t, config)
      const netCents = transactionNetCents(t, config)

      if (t.type === "income") {
        period.outputVatCents += vatCents
        period.incomeBaseCents += netCents
      } else {
        period.inputVatCents += vatCents
        period.expenseBaseCents += netCents
      }
    }

    for (const p of periods) {
      p.netVatCents = p.outputVatCents - p.inputVatCents
    }

    const totals = periods.reduce(
      (acc, p) => ({
        outputVatCents: acc.outputVatCents + p.outputVatCents,
        inputVatCents: acc.inputVatCents + p.inputVatCents,
        netVatCents: acc.netVatCents + p.netVatCents,
        incomeBaseCents: acc.incomeBaseCents + p.incomeBaseCents,
        expenseBaseCents: acc.expenseBaseCents + p.expenseBaseCents,
      }),
      { outputVatCents: 0, inputVatCents: 0, netVatCents: 0, incomeBaseCents: 0, expenseBaseCents: 0 }
    )

    return {
      currency,
      year,
      yearLabel: financialYearLabel(year, fyStart),
      granularity,
      basis,
      periods,
      totals,
    }
  }
)

// --------------------------------------------------------------- Annual report

export type AnnualCategoryRow = {
  code: string
  name: string
  color: string
  incomeCents: number
  expenseCents: number
}

export type AnnualReport = {
  currency: string
  year: number
  yearLabel: string
  categories: AnnualCategoryRow[]
  totalIncomeCents: number
  totalExpenseCents: number
  profitCents: number
  vatCollectedCents: number
  vatPaidCents: number
}

export const getAnnualReport = cache(
  async (userId: string, year: number): Promise<AnnualReport> => {
    const { currency, fyStart, vat } = await reportingContext(userId)
    const { from, to } = financialYearRange(year, fyStart)

    const transactions = await prisma.transaction.findMany({
      where: {
        AND: [await getTransactionVisibility(userId), { issuedAt: { gte: from, lt: to } }],
      },
      include: { category: true },
    })

    const rows = new Map<string, AnnualCategoryRow>()
    let totalIncomeCents = 0
    let totalExpenseCents = 0
    let vatCollectedCents = 0
    let vatPaidCents = 0

    for (const t of transactions) {
      const amount = amountInCurrencyCents(t, currency)
      if (amount === null) continue

      const code = t.categoryCode || "uncategorized"
      if (!rows.has(code)) {
        rows.set(code, {
          code,
          name: t.category?.name || "Uncategorized",
          color: t.category?.color || "#6b7280",
          incomeCents: 0,
          expenseCents: 0,
        })
      }
      const row = rows.get(code)!
      const vatCents = transactionVatCents(t, vat)

      if (t.type === "income") {
        row.incomeCents += amount
        totalIncomeCents += amount
        vatCollectedCents += vatCents
      } else {
        row.expenseCents += amount
        totalExpenseCents += amount
        vatPaidCents += vatCents
      }
    }

    const categories = Array.from(rows.values()).sort(
      (a, b) => b.incomeCents + b.expenseCents - (a.incomeCents + a.expenseCents)
    )

    return {
      currency,
      year,
      yearLabel: financialYearLabel(year, fyStart),
      categories,
      totalIncomeCents,
      totalExpenseCents,
      profitCents: totalIncomeCents - totalExpenseCents,
      vatCollectedCents,
      vatPaidCents,
    }
  }
)

// ----------------------------------------------------------- Receivables/aging

export type AgingBucket = "current" | "d1_30" | "d31_60" | "d61_90" | "d90_plus"

export type Receivable = {
  id: string
  name: string | null
  merchant: string | null
  totalCents: number
  currencyCode: string
  issuedAt: Date | null
  dueDate: Date | null
  status: string | null
  daysOverdue: number
  bucket: AgingBucket
}

export type ReceivablesReport = {
  currency: string
  invoices: Receivable[]
  buckets: Record<AgingBucket, number> // totals in reporting currency, cents
  totalOutstandingCents: number
  overdueCount: number
}

const DAY_MS = 1000 * 60 * 60 * 24

function agingBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return "current"
  if (daysOverdue <= 30) return "d1_30"
  if (daysOverdue <= 60) return "d31_60"
  if (daysOverdue <= 90) return "d61_90"
  return "d90_plus"
}

// An invoice is any income transaction with a tracked receivable status.
export const RECEIVABLE_UNPAID_STATUSES = ["unpaid", "overdue", "pending"]

export const getReceivablesReport = cache(
  async (userId: string, now: Date = new Date()): Promise<ReceivablesReport> => {
    const { currency } = await reportingContext(userId)

    const transactions = await prisma.transaction.findMany({
      where: {
        AND: [
          await getTransactionVisibility(userId),
          { type: "income" },
          { status: { in: RECEIVABLE_UNPAID_STATUSES } },
        ],
      },
      orderBy: [{ dueDate: "asc" }, { issuedAt: "asc" }],
    })

    const buckets: Record<AgingBucket, number> = {
      current: 0,
      d1_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90_plus: 0,
    }
    let totalOutstandingCents = 0
    let overdueCount = 0

    const invoices: Receivable[] = transactions.map((t) => {
      const due = t.dueDate ?? t.issuedAt ?? null
      const daysOverdue = due ? Math.floor((now.getTime() - due.getTime()) / DAY_MS) : 0
      const bucket = agingBucket(daysOverdue)
      const totalCents = t.total ?? 0
      const inReportingCurrency = amountInCurrencyCents(t, currency)

      if (inReportingCurrency !== null) {
        buckets[bucket] += inReportingCurrency
        totalOutstandingCents += inReportingCurrency
      }
      if (daysOverdue > 0) overdueCount++

      return {
        id: t.id,
        name: t.name,
        merchant: t.merchant,
        totalCents,
        currencyCode: t.currencyCode || currency,
        issuedAt: t.issuedAt,
        dueDate: t.dueDate,
        status: t.status,
        daysOverdue,
        bucket,
      }
    })

    return { currency, invoices, buckets, totalOutstandingCents, overdueCount }
  }
)

// Overdue invoices whose stored status is stale (still "unpaid" though past due).
// Used by the mark-overdue maintenance action and reminder flows.
export const getOverdueInvoices = cache(async (userId: string, now: Date = new Date()) => {
  const report = await getReceivablesReport(userId, now)
  return report.invoices.filter((i) => i.daysOverdue > 0)
})

// Count of transactions missing required fields — for the dashboard completeness widget.
export const getIncompleteTransactionCount = cache(async (userId: string): Promise<number> => {
  const [fields, transactions] = await Promise.all([
    prisma.field.findMany({ where: { userId, isRequired: true } }),
    prisma.transaction.findMany({ where: await getTransactionVisibility(userId) }),
  ])

  return transactions.filter((t) =>
    fields.some((f) => {
      const value = f.isExtra
        ? (t.extra as Record<string, unknown> | null)?.[f.code]
        : (t as unknown as Record<string, unknown>)[f.code]
      return value === undefined || value === null || value === ""
    })
  ).length
})
