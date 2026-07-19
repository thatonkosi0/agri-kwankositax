import { Receipt, CalendarRange, FileClock } from "lucide-react"
import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reports",
}

const REPORTS = [
  {
    href: "/reports/vat",
    icon: Receipt,
    name: "VAT Report",
    description: "Monthly or quarterly output vs input VAT and the net VAT payable to SARS.",
  },
  {
    href: "/reports/annual",
    icon: CalendarRange,
    name: "Annual Income & Expense",
    description: "Income and expenses by category for a full financial year, with profit.",
  },
  {
    href: "/reports/receivables",
    icon: FileClock,
    name: "Receivables & Aging",
    description: "Outstanding and overdue invoices with a 30/60/90-day aging breakdown.",
  },
]

export default async function ReportsPage() {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h2 className="flex flex-row gap-3 md:gap-5">
          <span className="text-3xl font-bold tracking-tight">Reports</span>
          <span className="text-3xl tracking-tight opacity-20">{REPORTS.length}</span>
        </h2>
      </header>

      <main className="flex flex-row gap-4 flex-wrap">
        {REPORTS.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="block shadow-xl max-w-[320px] p-6 bg-white rounded-lg hover:shadow-md transition-shadow border-4 border-gray-100"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-row items-center gap-4">
                <report.icon className="w-9 h-9" strokeWidth={1.5} />
                <div className="text-2xl font-semibold">{report.name}</div>
              </div>
              <div className="text-sm">{report.description}</div>
            </div>
          </Link>
        ))}
      </main>
    </>
  )
}
