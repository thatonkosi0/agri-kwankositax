import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, TriangleAlert } from "lucide-react"
import Link from "next/link"

export default function DashboardCompletenessWidget({ incompleteCount }: { incompleteCount: number }) {
  const isClean = incompleteCount === 0
  return (
    <Card className={`w-full h-full sm:max-w-xs ${isClean ? "" : "border-amber-300"}`}>
      <CardHeader>
        <CardTitle>
          <Link href="/transactions" className="flex items-center gap-2">
            {isClean ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <TriangleAlert className="w-5 h-5 text-amber-500" />}
            Data completeness &rarr;
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{isClean ? "All good" : incompleteCount}</div>
        <div className="text-sm text-muted-foreground">
          {isClean ? "every transaction has its required fields" : "transactions missing required fields"}
        </div>
      </CardContent>
    </Card>
  )
}
