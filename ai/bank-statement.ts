import { AnalyzeAttachment } from "./attachments"
import { requestLLM } from "./providers/llmProvider"
import { getLLMSettings, SettingsMap } from "@/models/settings"
import { DEFAULT_PROMPT_ANALYSE_BANK_STATEMENT } from "@/models/defaults"

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

export type BankStatementResult = {
  success: boolean
  error?: string
  currency?: string
  rows?: BankStatementRow[]
  tokensUsed?: number
}

function parseStatementResponse(response: {
  error?: string
  output: unknown
  tokensUsed?: number
}): BankStatementResult {
  if (response.error) {
    return { success: false, error: response.error }
  }

  const output = response.output as { currency?: string; transactions?: BankStatementRow[] }
  const rows = Array.isArray(output.transactions) ? output.transactions : []

  return {
    success: true,
    currency: output.currency,
    rows,
    tokensUsed: response.tokensUsed,
  }
}

// Runs the bank-statement extraction against the configured LLM providers.
// Returns the parsed rows for review — it does NOT create any transactions.
// Uses the admin's editable prompt from settings, falling back to the default.
export async function analyzeBankStatement(
  attachments: AnalyzeAttachment[],
  settings: SettingsMap
): Promise<BankStatementResult> {
  const llmSettings = getLLMSettings(settings)

  const response = await requestLLM(llmSettings, {
    prompt: settings.prompt_analyse_bank_statement || DEFAULT_PROMPT_ANALYSE_BANK_STATEMENT,
    schema: bankStatementSchema as unknown as Record<string, unknown>,
    attachments,
  })

  return parseStatementResponse(response)
}

// Same extraction, but from the statement's already-extracted TEXT rather than a
// rendered image. Text-based PDFs are extracted in the browser (pdf.js) and sent
// here — the payload is tiny and the model reads it far faster than a full-page
// image, so a single request stays well under the serverless time limit.
export async function analyzeBankStatementText(
  statementText: string,
  settings: SettingsMap
): Promise<BankStatementResult> {
  const llmSettings = getLLMSettings(settings)
  const basePrompt = settings.prompt_analyse_bank_statement || DEFAULT_PROMPT_ANALYSE_BANK_STATEMENT

  const response = await requestLLM(llmSettings, {
    prompt: `${basePrompt}\n\nBelow is the text extracted from the bank statement, with each printed line on its own line. Parse every transaction line from it:\n\n---\n${statementText}\n---`,
    schema: bankStatementSchema as unknown as Record<string, unknown>,
  })

  return parseStatementResponse(response)
}
