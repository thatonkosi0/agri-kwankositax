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
  category?: string // one of the user's category codes, chosen by the model
}

// A category the model may assign to a transaction. `llm_prompt` (if set) tells
// the model what kinds of transactions belong to that category.
export type CategoryHint = { code: string; llm_prompt?: string | null }

// The transaction schema, optionally with a `category` field constrained to the
// user's category codes so the model classifies each line as it extracts it.
function buildBankStatementSchema(categoryCodes: string[]) {
  const transactionProperties: Record<string, unknown> = {
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
  }

  if (categoryCodes.length > 0) {
    transactionProperties.category = {
      type: "string",
      enum: categoryCodes,
      description: "The single best-matching category code for this transaction from the allowed list.",
    }
  }

  return {
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
          properties: transactionProperties,
          required: ["date", "description", "amount", "direction"],
          additionalProperties: false,
        },
      },
    },
    required: ["currency", "transactions"],
    additionalProperties: false,
  }
}

// Backwards-compatible default schema (no category constraint).
export const bankStatementSchema = buildBankStatementSchema([])

// Appends a categorisation instruction plus the allowed categories to the prompt,
// so the model tags each transaction with one of the user's category codes.
function categoryInstruction(categories: CategoryHint[]): string {
  if (categories.length === 0) return ""
  const list = categories
    .map((c) => (c.llm_prompt ? `- ${c.code}: for ${c.llm_prompt}` : `- ${c.code}`))
    .join("\n")
  return `\n\nAlso classify every transaction into exactly one of these categories, using the "category" field with the category's code. Pick the single best match; if nothing fits well, use "other".\nAllowed categories:\n${list}`
}

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
  settings: SettingsMap,
  categories: CategoryHint[] = []
): Promise<BankStatementResult> {
  const llmSettings = getLLMSettings(settings)
  const basePrompt = settings.prompt_analyse_bank_statement || DEFAULT_PROMPT_ANALYSE_BANK_STATEMENT
  const categoryCodes = categories.map((c) => c.code)

  const response = await requestLLM(llmSettings, {
    prompt: `${basePrompt}${categoryInstruction(categories)}`,
    schema: buildBankStatementSchema(categoryCodes) as unknown as Record<string, unknown>,
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
  settings: SettingsMap,
  categories: CategoryHint[] = []
): Promise<BankStatementResult> {
  const llmSettings = getLLMSettings(settings)
  const basePrompt = settings.prompt_analyse_bank_statement || DEFAULT_PROMPT_ANALYSE_BANK_STATEMENT
  const categoryCodes = categories.map((c) => c.code)

  const response = await requestLLM(llmSettings, {
    prompt: `${basePrompt}${categoryInstruction(categories)}\n\nBelow is the text extracted from the bank statement, with each printed line on its own line. Parse every transaction line from it:\n\n---\n${statementText}\n---`,
    schema: buildBankStatementSchema(categoryCodes) as unknown as Record<string, unknown>,
  })

  return parseStatementResponse(response)
}
