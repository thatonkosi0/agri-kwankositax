import { ReportControls } from "@/components/reports/report-controls"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCurrentUser } from "@/lib/auth"
import { financialYearLabel, financialYearOf, PeriodGranularity } from "@/lib/reports"
import { formatCurrency } from "@/lib/utils"
import { getVatReport } from "@/models/reports"
import { getSettings } from "@/models/settings"
import { Metadata } from "next"

export const metadata: Metadata = { title: "VAT Report" }

type SearchParams = { year?: string; granularity?: string; basis?: string }

export default async function VatReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const user = await getCurrentUser()
  const settings = await getSettings(user.id)
  const fyStart = Number(settings.financial_year_start_month) || 1

  const currentFy = financialYearOf(new Date(), fyStart)
  const year = Number(params.year) || currentFy
  const granularity: PeriodGranularity = params.granularity === "month" ? "month" : "quarter"
  const basis = params.basis === "cash" ? "cash" : params.basis === "accrual" ? "accrual" : undefined

  const report = await getVatReport(user.id, year, granularity, basis)
  const money = (cents: number) => formatCurrency(cents, report.currency)
  const rands = (cents: number) => (cents / 100).toFixed(2)

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentFy - i).map((y) => ({
    value: String(y),
    label: financialYearLabel(y, fyStart),
  }))

  const csv = {
    filename: `vat-report-${report.yearLabel.replace("/", "-")}-${granularity}.csv`,
    rows: [
      ["Period", "Output VAT", "Input VAT", "Net VAT", "Income (excl VAT)", "Expenses (excl VAT)"],
      ...report.periods.map((p) => [
        p.label,
        rands(p.outputVatCents),
        rands(p.inputVatCents),
        rands(p.netVatCents),
        rands(p.incomeBaseCents),
        rands(p.expenseBaseCents),
      ]),
      [
        "TOTAL",
        rands(report.totals.outputVatCents),
        rands(report.totals.inputVatCents),
        rands(report.totals.netVatCents),
        rands(report.totals.incomeBaseCents),
        rands(report.totals.expenseBaseCents),
      ],
    ] as (string | number)[][],
  }

  const netPayable = report.totals.netVatCents

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">VAT Report</h2>
        <span className="text-muted-foreground">
          Financial year {report.yearLabel} · {report.currency} · {report.basis} basis
        </span>
      </header>

      <ReportControls
        selectors={[
          { param: "year", label: "Financial year", value: String(year), options: yearOptions },
          {
            param: "granularity",
            label: "Period",
            value: granularity,
            options: [
              { value: "quarter", label: "Quarterly" },
              { value: "month", label: "Monthly" },
            ],
          },
          {
            param: "basis",
            label: "Basis",
            value: report.basis,
            options: [
              { value: "accrual", label: "Invoice (accrual)" },
              { value: "cash", label: "Payments (cash)" },
            ],
          },
        ]}
        csv={csv}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Output VAT (collected)</CardDescription>
            <CardTitle className="text-2xl">{money(report.totals.outputVatCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Input VAT (paid)</CardDescription>
            <CardTitle className="text-2xl">{money(report.totals.inputVatCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{netPayable >= 0 ? "Net VAT payable to SARS" : "Net VAT refund due"}</CardDescription>
            <CardTitle className={`text-2xl ${netPayable >= 0 ? "text-red-600" : "text-green-600"}`}>
              {money(Math.abs(netPayable))}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown by {granularity === "month" ? "month" : "quarter"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Output VAT</TableHead>
                <TableHead className="text-right">Input VAT</TableHead>
                <TableHead className="text-right">Net VAT</TableHead>
                <TableHead className="text-right">Income (excl.)</TableHead>
                <TableHead className="text-right">Expenses (excl.)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.periods.map((p) => (
                <TableRow key={p.key}>
                  <TableCell className="font-medium">{p.label}</TableCell>
                  <TableCell className="text-right">{money(p.outputVatCents)}</TableCell>
                  <TableCell className="text-right">{money(p.inputVatCents)}</TableCell>
                  <TableCell className="text-right font-medium">{money(p.netVatCents)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{money(p.incomeBaseCents)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{money(p.expenseBaseCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">{money(report.totals.outputVatCents)}</TableCell>
                <TableCell className="text-right font-semibold">{money(report.totals.inputVatCents)}</TableCell>
                <TableCell className="text-right font-semibold">{money(report.totals.netVatCents)}</TableCell>
                <TableCell className="text-right font-semibold">{money(report.totals.incomeBaseCents)}</TableCell>
                <TableCell className="text-right font-semibold">{money(report.totals.expenseBaseCents)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        Only transactions in {report.currency} are included. VAT is taken from each document where captured, otherwise
        derived from the total at the configured rate ({settings.vat_rate || "15"}%). This report is a working aid, not a
        substitute for a SARS VAT201 return.
      </p>
    </>
  )
}
