import { FormTextarea } from "@/components/forms/simple"
import TransactionEditForm from "@/components/transactions/edit"
import TransactionFiles from "@/components/transactions/transaction-files"
import { Card } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth"
import { incompleteTransactionFields } from "@/lib/stats"
import { getCategories } from "@/models/categories"
import { getCurrencies } from "@/models/currencies"
import { getFields } from "@/models/fields"
import { getFilePageCount, getFilesByTransactionId } from "@/models/files"
import { getUserById } from "@/models/users"
import { getProjects } from "@/models/projects"
import { getSettings } from "@/models/settings"
import { getTransactionById } from "@/models/transactions"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function TransactionPage({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params
  const user = await getCurrentUser()
  const transaction = await getTransactionById(transactionId, user.id)
  if (!transaction) {
    notFound()
  }

  const files = await getFilesByTransactionId(transactionId, user.id)
  // Preview-able page count per file, so multi-page PDFs (e.g. bank statements)
  // show every page, not just the first. Files may be owned by another member on
  // a shared project, so resolve each file's storage owner for the page count.
  const ownerCache = new Map<string, typeof user | null>([[user.id, user]])
  const filePageCounts: Record<string, number> = {}
  for (const file of files) {
    if (!ownerCache.has(file.userId)) {
      ownerCache.set(file.userId, await getUserById(file.userId))
    }
    const owner = ownerCache.get(file.userId)
    filePageCounts[file.id] = owner ? await getFilePageCount(owner, file) : 1
  }
  const categories = await getCategories(user.id)
  const currencies = await getCurrencies(user.id)
  const settings = await getSettings(user.id)
  const fields = await getFields(user.id)
  const projects = await getProjects(user.id)
  const incompleteFields = incompleteTransactionFields(fields, transaction)

  return (
    <div className="flex flex-wrap flex-row items-start justify-center gap-4 max-w-6xl">
      <Card className="w-full flex-1 flex flex-col flex-wrap justify-center items-start overflow-hidden bg-gradient-to-br from-violet-50/80 via-indigo-50/80 to-white border-violet-200/60">
        {incompleteFields.length > 0 && (
          <div className="w-full flex flex-col gap-1 rounded-md bg-yellow-50 p-5">
            <span>
              Some fields are incomplete: <strong>{incompleteFields.map((field) => field.name).join(", ")}</strong>
            </span>
            <span className="text-xs text-muted-foreground">
              You can decide which fields are required for you in{" "}
              <Link href="/settings/fields" className="underline">
                Fields settings
              </Link>
              .
            </span>
          </div>
        )}
        <div className="w-full p-5">
          <TransactionEditForm
            transaction={transaction}
            categories={categories}
            currencies={currencies}
            settings={settings}
            fields={fields}
            projects={projects}
          />

          {transaction.text && (
            <details className="mt-10">
              <summary className="cursor-pointer text-sm font-medium">Recognized Text</summary>
              <Card className="flex items-stretch p-2 max-w-6xl">
                <div className="flex-1">
                  <FormTextarea
                    name="text"
                    defaultValue={transaction.text || ""}
                    hideIfEmpty={true}
                    className="w-full h-[400px]"
                  />
                </div>
              </Card>
            </details>
          )}
        </div>
      </Card>

      <div className="w-1/2 max-w-[400px] space-y-4">
        <TransactionFiles transaction={transaction} files={files} filePageCounts={filePageCounts} />
      </div>
    </div>
  )
}
