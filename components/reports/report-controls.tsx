"use client"

import { Button } from "@/components/ui/button"
import { Download, Printer } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export type ReportSelector = {
  param: string
  label: string
  value: string
  options: { value: string; label: string }[]
}

export type ReportCsv = {
  filename: string
  rows: (string | number)[][] // first row is the header
}

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "")
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
        })
        .join(",")
    )
    .join("\n")
}

export function ReportControls({ selectors, csv }: { selectors: ReportSelector[]; csv?: ReportCsv }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = (param: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(param, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  const downloadCsv = () => {
    if (!csv) return
    const blob = new Blob([toCsv(csv.rows)], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = csv.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      {selectors.map((selector) => (
        <label key={selector.param} className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted-foreground">{selector.label}</span>
          <select
            value={selector.value}
            onChange={(e) => updateParam(selector.param, e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {selector.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      <div className="ml-auto flex gap-2">
        {csv && (
          <Button type="button" variant="outline" onClick={downloadCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </Button>
      </div>
    </div>
  )
}
