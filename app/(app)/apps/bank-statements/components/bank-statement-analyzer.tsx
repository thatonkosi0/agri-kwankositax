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
import {
  analyzeStatementImagesAction,
  analyzeStatementTextAction,
  saveStatementRowsAction,
  uploadStatementAction,
} from "../actions"
import { extractPageText, fileToBase64, loadPdfDocument } from "./render-pdf"

type Phase = "idle" | "analyzing" | "review"

const MAX_PAGES = 40

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
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const analyze = async (file: File) => {
    setPhase("analyzing")
    setRows([])
    setProgress(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const uploaded = await uploadStatementAction(formData)

      if (!uploaded.success || !uploaded.data) {
        toast.error(uploaded.error || "Failed to upload statement")
        setPhase("idle")
        return
      }

      setFileId(uploaded.data.fileId)

      const collected: BankStatementRow[] = []
      let resolvedCurrency = uploaded.data.defaultCurrency || defaultCurrency
      let anySucceeded = false
      let anyFailed = false

      const collectChunk = (chunk: Awaited<ReturnType<typeof analyzeStatementTextAction>>) => {
        if (chunk.success && chunk.data) {
          anySucceeded = true
          collected.push(...chunk.data.rows)
          if (chunk.data.currency) resolvedCurrency = chunk.data.currency
          setRows([...collected])
        } else {
          anyFailed = true
          toast.error(chunk.error || "Failed to analyze a page")
        }
      }

      if (file.type === "application/pdf") {
        // Extract each page's text in the browser and analyze the text (tiny and
        // fast) — no image rendering, no vision latency, so no request can stall.
        const pdf = await loadPdfDocument(file)
        const totalPages = Math.min(pdf.numPages, MAX_PAGES)
        if (pdf.numPages > MAX_PAGES) {
          toast.warning(`Statement has ${pdf.numPages} pages; analyzing the first ${MAX_PAGES}.`)
        }
        setProgress({ done: 0, total: totalPages })
        let anyText = false
        for (let i = 1; i <= totalPages; i++) {
          const pageText = await extractPageText(pdf, i)
          if (pageText.trim().length > 0) {
            anyText = true
            collectChunk(await analyzeStatementTextAction(pageText))
          }
          setProgress({ done: i, total: totalPages })
        }
        if (!anyText) {
          // No text layer on any page — almost certainly a scanned/image-only PDF.
          toast.error(
            "This PDF has no readable text (it looks scanned). Upload a photo or image export of the statement instead.",
            { duration: 10000 }
          )
          setPhase("idle")
          return
        }
      } else {
        // Image statement — no text to extract, so read it with vision directly.
        setProgress({ done: 0, total: 1 })
        const image = { contentType: file.type || "image/jpeg", base64: await fileToBase64(file) }
        collectChunk(await analyzeStatementImagesAction([image]))
        setProgress({ done: 1, total: 1 })
      }

      if (!anySucceeded) {
        setPhase("idle")
        return
      }

      if (collected.length === 0) {
        toast.warning("No transactions were detected in this statement")
      } else if (anyFailed) {
        toast.warning("Some pages couldn't be analyzed — review the results and re-upload if needed.")
      }
      setCurrency(resolvedCurrency)
      setRows(collected)
      setPhase("review")
    } catch (error) {
      console.error("Bank statement analysis failed:", error)
      toast.error("Analysis failed. Please try again.", { duration: 8000 })
      setPhase("idle")
    } finally {
      setProgress(null)
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
              {progress && progress.total > 1
                ? `Analyzing pages ${progress.done}/${progress.total}…`
                : "Analyzing statement…"}
            </>
          ) : (
            "Choose statement"
          )}
        </Button>
        {phase === "analyzing" && rows.length > 0 && (
          <p className="text-sm text-muted-foreground">{rows.length} transactions found so far…</p>
        )}
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
