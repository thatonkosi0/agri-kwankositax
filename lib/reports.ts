import { Transaction } from "@/prisma/client"

// The amount of a transaction expressed in the reporting (default) currency, in
// CENTS. Mirrors the currency-selection logic used across the dashboard stats:
// prefer the converted amount when it is already in the default currency,
// otherwise use the original amount when it matches. Returns null when the
// transaction can't be expressed in the default currency.
export function amountInCurrencyCents(transaction: Transaction, defaultCurrency: string): number | null {
  const target = defaultCurrency.toUpperCase()
  if (transaction.convertedCurrencyCode?.toUpperCase() === target) {
    return transaction.convertedTotal ?? 0
  }
  if (transaction.currencyCode?.toUpperCase() === target) {
    return transaction.total ?? 0
  }
  return null
}

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export type PeriodGranularity = "month" | "quarter"

// A financial year labelled by the calendar year in which it STARTS.
// e.g. startMonth=3 (March), year=2025 => 2025-03-01 .. 2026-02-28/29.
export function financialYearRange(year: number, startMonth: number): { from: Date; to: Date } {
  const from = new Date(Date.UTC(year, startMonth - 1, 1))
  const to = new Date(Date.UTC(year + 1, startMonth - 1, 1))
  return { from, to }
}

// Which financial year a date belongs to (labelled by its starting calendar year).
export function financialYearOf(date: Date, startMonth: number): number {
  const y = date.getUTCFullYear()
  return date.getUTCMonth() + 1 >= startMonth ? y : y - 1
}

// Zero-based index (0..11) of a date within a financial year that starts at startMonth.
export function financialMonthIndex(date: Date, startMonth: number): number {
  return (date.getUTCMonth() - (startMonth - 1) + 12) % 12
}

// Human label for a financial year, e.g. "2025/26" for a March start, or the
// plain year for a January start.
export function financialYearLabel(year: number, startMonth: number): string {
  if (startMonth === 1) return String(year)
  const next = (year + 1) % 100
  return `${year}/${String(next).padStart(2, "0")}`
}

export function quarterLabel(financialMonthIdx: number): string {
  return `Q${Math.floor(financialMonthIdx / 3) + 1}`
}
