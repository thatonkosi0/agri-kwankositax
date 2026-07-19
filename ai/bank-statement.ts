import { AnalyzeAttachment } from "./attachments"
import { requestLLM } from "./providers/llmProvider"
import { getLLMSettings, SettingsMap } from "@/models/settings"

export type BankStatementRow = {
  date: string
  description: string
  amount: number // absolute value, in currency units
  direction: "income" | "expense"
  balance?: number
}

export const bankStatementSchema = {
  type: "object",
  properties: {
    currency: {
      type: "string",
      description: "ISO 4217 currency code of the account, e.g. ZAR. Infer from the statement.",
    },
    transactions: {
      type: "array",
      description: "Every transaction line on the statement, in order. Do not skip any rows.",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Transaction date in YYYY-MM-DD format" },
          description: { type: "string", description: "The transaction description/narrative as written" },
          amount: {
            type: "number",
            description: "The absolute transaction amount as a positive number, digits only (e.g. 1499.99)",
          },
          direction: {
            type: "string",
            enum: ["income", "expense"],
            description: "'income' for money received (credit/deposit), 'expense' for money paid out (debit/withdrawal)",
          },
          balance: { type: "number", description: "Running account balance after this line, if shown" },
        },
        required: ["date", "description", "amount", "direction"],
        additionalProperties: false,
      },
    },
  },
  required: ["currency", "transactions"],
  additionalProperties: false,
} as const

export const BANK_STATEMENT_PROMPT = `You are a careful accounting assistant for Agri-Kwankosi, a South African agricultural cooperative. You are reading a BANK STATEMENT (printed or PDF), in any South African language, and extracting every individual transaction line for bookkeeping.

Rules:
- Extract EVERY transaction row on every page. Do not summarise, merge or skip rows. Opening/closing balance lines are NOT transactions — ignore them.
- date: the posting/transaction date as YYYY-MM-DD. South African statements use day/month/year order.
- description: the narrative exactly as written.
- amount: the absolute value as a positive number with a decimal point, no currency symbol or thousands separators (e.g. 1499.99, not "R 1 499,99").
- direction: "income" for credits/deposits/money in; "expense" for debits/withdrawals/fees/money out. Use the debit/credit columns or the sign to decide.
- balance: the running balance after the line if the statement shows one; otherwise omit it.
- currency: the ISO 4217 code of the account (default ZAR for South African banks if not stated).

Accuracy is the most important thing. Never invent or estimate a value. If a field is unreadable, use your best faithful reading of what is printed. Return only the structured data requested.`

// Runs the bank-statement extraction against the configured LLM providers.
// Returns the parsed rows for review — it does NOT create any transactions.
export async function analyzeBankStatement(
  attachments: AnalyzeAttachment[],
  settings: SettingsMap
): Promise<{ success: boolean; error?: string; currency?: string; rows?: BankStatementRow[]; tokensUsed?: number }> {
  const llmSettings = getLLMSettings(settings)

  const response = await requestLLM(llmSettings, {
    prompt: BANK_STATEMENT_PROMPT,
    schema: bankStatementSchema as unknown as Record<string, unknown>,
    attachments,
  })

  if (response.error) {
    return { success: false, error: response.error }
  }

  const output = response.output as unknown as { currency?: string; transactions?: BankStatementRow[] }
  const rows = Array.isArray(output.transactions) ? output.transactions : []

  return {
    success: true,
    currency: output.currency,
    rows,
    tokensUsed: response.tokensUsed,
  }
}
