"use client"

import { useRef, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { CloudUpload, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FieldError,
  SelectField,
  TextField,
} from "@/components/neo/wizard-fields"
import { fileTypes } from "@/lib/neo-wizard"
import type { WizardValues } from "@/lib/neo-schemas"

const ACCEPTED_EXT = [
  "jpeg",
  "jpg",
  "pdf",
  "xls",
  "xlsx",
  "xlsm",
  "doc",
  "docx",
  "eml",
  "msg",
  "zip",
  "png",
  "ppt",
  "pptx",
]

export function DocumentsStep() {
  const { setValue, control } = useFormContext<WizardValues>()
  const docs = useWatch({ control, name: "docs" }) ?? []
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileType, setFileType] = useState("")
  const [description, setDescription] = useState("")
  const [fileError, setFileError] = useState<string | null>(null)

  const addFiles = (files: FileList | null) => {
    if (!files) return
    if (!fileType) {
      setFileError("Select a File Type before uploading")
      return
    }
    const incoming = Array.from(files)
    const bad = incoming.find((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? ""
      return !ACCEPTED_EXT.includes(ext)
    })
    if (bad) {
      setFileError(
        `"${bad.name}" is not a permitted file type (jpeg, jpg, pdf, xls, xlsx, xlsm, doc, docx, Emails, zip, png, ppt, pptx)`
      )
      return
    }
    const oversized = incoming.find((f) => f.size > 25 * 1024 * 1024)
    if (oversized) {
      setFileError(`"${oversized.name}" exceeds the 25 MB limit`)
      return
    }
    const next = incoming.map((f) => ({
      name: f.name.slice(0, 255),
      type: fileType,
      description: description.slice(0, 2000),
    }))
    setValue("docs", [...docs, ...next], { shouldValidate: true })
    setFileType("")
    setDescription("")
    setFileError(null)
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-10">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-8 text-[11px] font-bold"
            onClick={() => fileRef.current?.click()}
          >
            UPLOAD
          </Button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-8 flex-1 items-center gap-2 rounded border border-dashed border-neutral-300 px-3 text-xs text-neutral-400"
          >
            <CloudUpload className="size-4" />
            Drop files here
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".jpeg,.jpg,.pdf,.xls,.xlsx,.xlsm,.doc,.docx,.eml,.msg,.zip,.png,.ppt,.pptx"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ""
            }}
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] font-bold text-neutral-700">
            Instructions
          </p>
          <p className="text-[11px] text-neutral-500">
            Permitted file types include jpeg, jpg, pdf, xls, xlsx, xlsm, doc,
            docx, Emails, zip, png, ppt, pptx
          </p>
        </div>
      </div>

      <FieldError message={fileError ?? undefined} />

      <div className="mt-4 grid grid-cols-2 gap-x-10">
        <SelectField
          label="File Type"
          value={fileType}
          onChange={setFileType}
          options={fileTypes}
          placeholder="-- Please Select File Type --"
        />
        <div>
          <TextField
            id="doc-desc"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
            placeholder="Description (max 2000)"
            maxLength={2000}
          />
          <p className="mt-0.5 text-right text-[10px] text-neutral-400">
            {description.length}/2000
          </p>
        </div>
      </div>

      <div className="mt-4 border border-neutral-200">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold text-neutral-600">
                File Name
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-neutral-600">
                File Type
              </TableHead>
              <TableHead className="text-[11px] font-semibold text-neutral-600">
                Description
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="py-6 text-center text-xs text-neutral-500"
                >
                  No items available
                </TableCell>
              </TableRow>
            ) : (
              docs.map((d, i) => (
                <TableRow key={`${d.name}-${i}`}>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>{d.type}</TableCell>
                  <TableCell>{d.description}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setValue(
                          "docs",
                          docs.filter((_, j) => j !== i),
                          { shouldValidate: true }
                        )
                      }
                      aria-label={`Remove ${d.name}`}
                    >
                      <Trash className="size-3.5 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
