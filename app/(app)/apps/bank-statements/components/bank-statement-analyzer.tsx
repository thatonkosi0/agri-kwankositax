"use client"

import type { BankStatementRow } from "@/ai/bank-statement"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { Project } from "@/prisma/client"
import { Loader2, Trash2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { saveStatementRowsAction, uploadAndAnalyzeStatementAction } from "../actions"

type Phase = "idle" | "analyzing" | "review"

export function BankStatementAnalyzer({
  projects,
  defaultCurrency,
}: {
  projects: Project[]
  defaultCurrency: string
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [fileId, setFileId] = useState<string | null>(null)
  const [rows, setRows] = useState<BankStatementRow[]>([])
  const [currency, setCurrency] = useState(defaultCurrency)
  const [projectCode, setProjectCode] = useState("")
  const [isSaving, startSaving] = useTransition()

  const analyze = async (file: File) => {
    setPhase("analyzing")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await uploadAndAnalyzeStatementAction(formData)

      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to analyze statement")
        setPhase("idle")
        return
      }

      if (result.data.rows.length === 0) {
        toast.warning("No transactions were detected in this statement")
      }
      setFileId(result.data.fileId)
      setCurrency(result.data.currency || defaultCurrency)
      setRows(result.data.rows)
      setPhase("review")
    } catch (error) {
      // A thrown action usually means the serverless function was killed —
      // most often the platform time limit on a large/multi-page statement.
      console.error("Bank statement analysis failed:", error)
      toast.error(
        "Analysis failed or timed out. Large statements can exceed the server time limit — try a shorter statement or fewer pages.",
        { duration: 8000 }
      )
      setPhase("idle")
    }
  }

  const updateRow = (index: number, patch: Partial<BankStatementRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const save = () => {
    if (!fileId) return
    startSaving(async () => {
      const result = await saveStatementRowsAction(fileId, rows, currency, projectCode || null)
      if (result.success && result.data) {
        toast.success(`${result.data.created} transactions created`)
        setPhase("idle")
        setRows([])
        setFileId(null)
        router.push("/transactions")
      } else {
        toast.error(result.error || "Failed to save transactions")
      }
    })
  }

  const incomeTotal = rows
    .filter((r) => r.direction === "income")
    .reduce((sum, r) => sum + Math.round(Math.abs(Number(r.amount) || 0) * 100), 0)
  const expenseTotal = rows
    .filter((r) => r.direction === "expense")
    .reduce((sum, r) => sum + Math.round(Math.abs(Number(r.amount) || 0) * 100), 0)

  if (phase === "idle" || phase === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl p-12 text-center">
        <Upload className="w-10 h-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Upload a bank statement (PDF or image)</p>
          <p className="text-sm text-muted-foreground">
            AI extracts every line into a reviewable list. Nothing is saved until you confirm.
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) analyze(file)
            e.target.value = ""
          }}
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={phase === "analyzing"}>
          {phase === "analyzing" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing statement…
            </>
          ) : (
            "Choose statement"
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">Currency</span>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            className="h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">Assign to project (optional)</span>
          <select
            value={projectCode}
            onChange={(e) => setProjectCode(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— None —</option>
            {projects.map((project) => (
              <option key={project.code} value={project.code}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto text-sm text-right">
          <div className="text-green-600">Income: {formatCurrency(incomeTotal, currency)}</div>
          <div className="text-red-600">Expenses: {formatCurrency(expenseTotal, currency)}</div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Type</TableHead>
              <TableHead className="w-32 text-right">Amount</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index}>
                <TableCell>
                  <input
                    type="date"
                    value={row.date || ""}
                    onChange={(e) => updateRow(index, { date: e.target.value })}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <input
                    value={row.description || ""}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <select
                    value={row.direction}
                    onChange={(e) => updateRow(index, { direction: e.target.value as "income" | "expense" })}
                    className={`h-8 w-full rounded-md border border-input bg-background px-2 text-sm ${
                      row.direction === "income" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </TableCell>
                <TableCell className="text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={row.amount}
                    onChange={(e) => updateRow(index, { amount: Number(e.target.value) })}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-right"
                  />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => removeRow(index)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{rows.length} transactions ready to import</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPhase("idle")
              setRows([])
              setFileId(null)
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving || rows.length === 0}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              `Import ${rows.length} transactions`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
