"use client"

import { markInvoicePaidAction, sendInvoiceReminderAction } from "@/app/(app)/reports/receivables/actions"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AgingBucket, Receivable } from "@/models/reports"
import { formatCurrency } from "@/lib/utils"
import { Check, Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

const BUCKET_LABELS: Record<AgingBucket, string> = {
  current: "Current",
  d1_30: "1–30 days",
  d31_60: "31–60 days",
  d61_90: "61–90 days",
  d90_plus: "90+ days",
}

function bucketClass(bucket: AgingBucket): string {
  switch (bucket) {
    case "current":
      return "text-muted-foreground"
    case "d1_30":
      return "text-amber-600"
    case "d31_60":
      return "text-orange-600"
    default:
      return "text-red-600 font-medium"
  }
}

export function ReceivablesTable({ invoices }: { invoices: Receivable[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [remindingId, setRemindingId] = useState<string | null>(null)
  const [email, setEmail] = useState("")

  const markPaid = (id: string) => {
    startTransition(async () => {
      const result = await markInvoicePaidAction(id, true)
      if (result.success) {
        toast.success("Invoice marked as paid")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update invoice")
      }
    })
  }

  const sendReminder = (id: string) => {
    startTransition(async () => {
      const result = await sendInvoiceReminderAction(id, email)
      if (result.success) {
        toast.success("Reminder sent")
        setRemindingId(null)
        setEmail("")
      } else {
        toast.error(result.error || "Failed to send reminder")
      }
    })
  }

  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No outstanding invoices. 🎉</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Age</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right print:hidden">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">{invoice.name || "—"}</TableCell>
            <TableCell className="text-muted-foreground">{invoice.merchant || "—"}</TableCell>
            <TableCell>{invoice.dueDate ? invoice.dueDate.toISOString().split("T")[0] : "—"}</TableCell>
            <TableCell className={bucketClass(invoice.bucket)}>
              {BUCKET_LABELS[invoice.bucket]}
              {invoice.daysOverdue > 0 ? ` (${invoice.daysOverdue}d)` : ""}
            </TableCell>
            <TableCell className="text-right">{formatCurrency(invoice.totalCents, invoice.currencyCode)}</TableCell>
            <TableCell className="text-right print:hidden">
              {remindingId === invoice.id ? (
                <div className="flex items-center justify-end gap-2">
                  <input
                    type="email"
                    placeholder="client@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-8 w-44 rounded-md border border-input bg-background px-2 text-sm"
                  />
                  <Button size="sm" onClick={() => sendReminder(invoice.id)} disabled={isPending}>
                    Send
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemindingId(null)} disabled={isPending}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRemindingId(invoice.id)
                      setEmail("")
                    }}
                    disabled={isPending}
                  >
                    <Mail className="h-4 w-4" />
                    Remind
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => markPaid(invoice.id)} disabled={isPending}>
                    <Check className="h-4 w-4" />
                    Mark paid
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
