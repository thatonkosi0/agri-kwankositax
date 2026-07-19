import { Transaction } from "@/prisma/client"
import { SettingsMap } from "@/models/settings"

// South African standard VAT rate, used as the fallback when neither the
// document nor the user's settings specify one.
export const DEFAULT_VAT_RATE = 15

export type VatConfig = {
  registered: boolean
  rate: number
  pricesIncludeVat: boolean
  basis: "accrual" | "cash"
}

export function getVatConfig(settings: SettingsMap): VatConfig {
  const rate = Number(settings.vat_rate)
  return {
    registered: settings.vat_registered !== "false",
    rate: Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_VAT_RATE,
    pricesIncludeVat: settings.vat_prices_include_vat !== "false",
    basis: settings.vat_basis === "cash" ? "cash" : "accrual",
  }
}

// Extra fields (vat, vat_rate) are stored as raw strings in currency units
// (rands), because the transaction form routes them through a string catchall
// rather than the cents transform used for `total`. Parse them defensively.
export function parseExtraNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const num = typeof value === "number" ? value : parseFloat(String(value))
  return Number.isFinite(num) ? num : null
}

function extra(transaction: Transaction): Record<string, unknown> {
  return (transaction.extra as Record<string, unknown> | null) ?? {}
}

// The VAT rate that applies to a single transaction: the document's own rate if
// captured, otherwise the configured default.
export function transactionVatRate(transaction: Transaction, config: VatConfig): number {
  const own = parseExtraNumber(extra(transaction).vat_rate)
  return own !== null ? own : config.rate
}

// VAT amount for a transaction, in CENTS (to match `total`).
// Prefers the VAT explicitly captured on the document; otherwise derives it from
// the total using the applicable rate and the inclusive/exclusive setting.
export function transactionVatCents(transaction: Transaction, config: VatConfig): number {
  const capturedRands = parseExtraNumber(extra(transaction).vat)
  if (capturedRands !== null) {
    return Math.round(capturedRands * 100)
  }

  const total = transaction.total ?? 0
  if (!total) return 0

  const rate = transactionVatRate(transaction, config)
  if (rate <= 0) return 0

  if (config.pricesIncludeVat) {
    // total is VAT-inclusive: VAT = total * rate / (100 + rate)
    return Math.round((total * rate) / (100 + rate))
  }
  // total is VAT-exclusive: VAT = total * rate / 100
  return Math.round((total * rate) / 100)
}

// The VAT-exclusive base amount (net), in CENTS.
export function transactionNetCents(transaction: Transaction, config: VatConfig): number {
  const total = transaction.total ?? 0
  const vat = transactionVatCents(transaction, config)
  return config.pricesIncludeVat ? total - vat : total
}
