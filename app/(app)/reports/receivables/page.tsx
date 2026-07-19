import { ReceivablesTable } from "@/components/reports/receivables-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth"
import { formatCurrency } from "@/lib/utils"
import { AgingBucket, getReceivablesReport } from "@/models/reports"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Receivables & Aging" }

const BUCKETS: { key: AgingBucket; label: string }[] = [
  { key: "current", label: "Current" },
  { key: "d1_30", label: "1–30 days" },
  { key: "d31_60", label: "31–60 days" },
  { key: "d61_90", label: "61–90 days" },
  { key: "d90_plus", label: "90+ days" },
]

export default async function ReceivablesPage() {
  const user = await getCurrentUser()
  const report = await getReceivablesReport(user.id)
  const money = (cents: number) => formatCurrency(cents, report.currency)

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Receivables &amp; Aging</h2>
        <span className="text-muted-foreground">
          {money(report.totalOutstandingCents)} outstanding · {report.overdueCount} overdue
        </span>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {BUCKETS.map((bucket) => (
          <Card key={bucket.key}>
            <CardHeader className="pb-2">
              <CardDescription>{bucket.label}</CardDescription>
              <CardTitle className="text-xl">{money(report.buckets[bucket.key])}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceivablesTable invoices={report.invoices} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        Aging buckets are measured from each invoice&apos;s due date (or issue date when no due date is set). Reminder
        emails are only sent when you explicitly click &ldquo;Remind&rdquo;. Totals shown in {report.currency}.
      </p>
    </>
  )
}
