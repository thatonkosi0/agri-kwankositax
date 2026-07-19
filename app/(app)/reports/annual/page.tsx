import { ReportControls } from "@/components/reports/report-controls"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCurrentUser } from "@/lib/auth"
import { financialYearLabel, financialYearOf } from "@/lib/reports"
import { formatCurrency } from "@/lib/utils"
import { getAnnualReport } from "@/models/reports"
import { getSettings } from "@/models/settings"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Annual Income & Expense Report" }

type SearchParams = { year?: string }

export default async function AnnualReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const user = await getCurrentUser()
  const settings = await getSettings(user.id)
  const fyStart = Number(settings.financial_year_start_month) || 1

  const currentFy = financialYearOf(new Date(), fyStart)
  const year = Number(params.year) || currentFy

  const report = await getAnnualReport(user.id, year)
  const money = (cents: number) => formatCurrency(cents, report.currency)
  const rands = (cents: number) => (cents / 100).toFixed(2)

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentFy - i).map((y) => ({
    value: String(y),
    label: financialYearLabel(y, fyStart),
  }))

  const csv = {
    filename: `annual-report-${report.yearLabel.replace("/", "-")}.csv`,
    rows: [
      ["Category", "Income", "Expenses", "Net"],
      ...report.categories.map((c) => [
        c.name,
        rands(c.incomeCents),
        rands(c.expenseCents),
        rands(c.incomeCents - c.expenseCents),
      ]),
      [
        "TOTAL",
        rands(report.totalIncomeCents),
        rands(report.totalExpenseCents),
        rands(report.profitCents),
      ],
    ] as (string | number)[][],
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Annual Income &amp; Expense</h2>
        <span className="text-muted-foreground">
          Financial year {report.yearLabel} · {report.currency}
        </span>
      </header>

      <ReportControls
        selectors={[{ param: "year", label: "Financial year", value: String(year), options: yearOptions }]}
        csv={csv}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total income</CardDescription>
            <CardTitle className="text-2xl text-green-600">{money(report.totalIncomeCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total expenses</CardDescription>
            <CardTitle className="text-2xl text-red-600">{money(report.totalExpenseCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{report.profitCents >= 0 ? "Net profit" : "Net loss"}</CardDescription>
            <CardTitle className="text-2xl">{money(Math.abs(report.profitCents))}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By category</CardTitle>
        </CardHeader>
        <CardContent>
          {report.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions in this financial year.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Income</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.categories.map((c) => {
                  const net = c.incomeCents - c.expenseCents
                  return (
                    <TableRow key={c.code}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{c.incomeCents ? money(c.incomeCents) : "—"}</TableCell>
                      <TableCell className="text-right">{c.expenseCents ? money(c.expenseCents) : "—"}</TableCell>
                      <TableCell className={`text-right font-medium ${net >= 0 ? "" : "text-red-600"}`}>
                        {money(net)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{money(report.totalIncomeCents)}</TableCell>
                  <TableCell className="text-right font-semibold">{money(report.totalExpenseCents)}</TableCell>
                  <TableCell className="text-right font-semibold">{money(report.profitCents)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        Only transactions in {report.currency} are included, grouped by their issue date into the {report.yearLabel}{" "}
        financial year (starts month {fyStart}). VAT collected this year: {money(report.vatCollectedCents)}; VAT paid:{" "}
        {money(report.vatPaidCents)}.
      </p>
    </>
  )
}
