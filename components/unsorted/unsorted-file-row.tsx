"use client"

import { FilePreview } from "@/components/files/preview"
import { Card } from "@/components/ui/card"
import AnalyzeForm from "@/components/unsorted/analyze-form"
import { Category, Currency, Field, File, Project } from "@/prisma/client"
import { useState } from "react"

// Wraps the preview + analyze form so the file image can show a scanning
// animation while the AI is analysing it.
export function UnsortedFileRow({
  file,
  categories,
  projects,
  currencies,
  fields,
  settings,
}: {
  file: File
  categories: Category[]
  projects: Project[]
  currencies: Currency[]
  fields: Field[]
  settings: Record<string, string>
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  return (
    <Card
      id={file.id}
      className="flex flex-row flex-wrap md:flex-nowrap justify-center items-start gap-5 p-5 bg-gradient-to-br from-violet-50/80 via-indigo-50/80 to-white border-violet-200/60 rounded-2xl"
    >
      <div className="w-full max-w-[500px]">
        <Card>
          <FilePreview file={file} isScanning={isAnalyzing} />
        </Card>
      </div>
      <div className="w-full">
        <AnalyzeForm
          file={file}
          categories={categories}
          projects={projects}
          currencies={currencies}
          fields={fields}
          settings={settings}
          onAnalyzingChange={setIsAnalyzing}
        />
      </div>
    </Card>
  )
}
