import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { FileClock } from "lucide-react"
import Link from "next/link"

export default function DashboardReceivablesWidget({
  outstandingCents,
  overdueCount,
  currency,
}: {
  outstandingCents: number
  overdueCount: number
  currency: string
}) {
  return (
    <Card className="w-full h-full sm:max-w-xs">
      <CardHeader>
        <CardTitle>
          <Link href="/reports/receivables" className="flex items-center gap-2">
            <FileClock className="w-5 h-5" />
            Receivables &rarr;
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(outstandingCents, currency)}</div>
        <div className="text-sm text-muted-foreground">
          outstanding{overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
        </div>
      </CardContent>
    </Card>
  )
}
