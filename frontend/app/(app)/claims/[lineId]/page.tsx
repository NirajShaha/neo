"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleDot } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { NeoHeader } from "@/components/neo/neo-header"
import { FieldError } from "@/components/neo/wizard-fields"
import { noteSchema, type NoteValues } from "@/lib/neo-schemas"
import { useNeoStore } from "@/lib/neo-store"
import { useApi } from "@/lib/neo-api"
import { cn } from "@/lib/utils"

const tabs = [
  "Summary",
  "Calculations",
  "CO2",
  "Inflation",
  "Parts",
  "Finance",
  "Approval Requests",
  "Attachments",
  "Tasks",
  "Notes",
  "Activity Log",
] as const

const phases = [
  "Creation",
  "Supplier Negotiations",
  "Approvals",
  "Awaiting Implementation",
  "Implemented",
  "Cancelled",
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-4 flex items-center gap-1 text-sm font-bold text-emerald-900">
      <span className="text-[10px]">﹀</span> {children}
    </h3>
  )
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-neutral-800">{label}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{value || "-"}</p>
    </div>
  )
}

type BackendNote = { id: string; note: string }
type BackendAttachment = {
  id: string
  fileName: string
  fileType: string
  description: string
}
type BackendActivity = {
  action: string
  description: string
  createdOn: string
}

export default function ClaimDetailPage() {
  const params = useParams()
  const router = useRouter()
  const lineId = decodeURIComponent(String(params.lineId ?? ""))
  const { claims, approvals, tasks, refresh } = useNeoStore()
  const { request } = useApi()
  const [tab, setTab] = useState<(typeof tabs)[number]>("Summary")
  const [notes, setNotes] = useState<string[]>([])
  const [backendNotes, setBackendNotes] = useState<BackendNote[]>([])
  const [attachments, setAttachments] = useState<BackendAttachment[]>([])
  const [activity, setActivity] = useState<BackendActivity[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState("Other")
  const [fileDesc, setFileDesc] = useState("")
  const [tabError, setTabError] = useState<string | null>(null)
  const noteForm = useForm<NoteValues>({
    resolver: zodResolver(noteSchema) as never,
    defaultValues: { note: "" },
    mode: "onTouched",
  })

  useEffect(() => {
    if (!lineId) return
    let cancelled = false
    const encoded = encodeURIComponent(lineId)
    const load = async () => {
      try {
        const [n, at, a] = await Promise.all([
          request<BackendNote[]>(`/api/claims/${encoded}/notes`),
          request<BackendAttachment[]>(`/api/claims/${encoded}/attachments`),
          request<BackendActivity[]>(`/api/claims/${encoded}/audit`),
        ])
        if (!cancelled) {
          setBackendNotes(n ?? [])
          setAttachments(at ?? [])
          setActivity(a ?? [])
        }
      } catch {
        /* backend unavailable: local fallback stays */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [lineId, request])

  const claim = claims.find((c) => c.lineId === lineId)
  if (!claim) {
    return (
      <div className="flex min-h-svh flex-col bg-neutral-100">
        <NeoHeader active="home" />
        <main className="flex-1 px-6 py-10 text-center">
          <p className="text-sm text-neutral-600">
            Claim {lineId} not found.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => router.push("/")}>
            Back to home
          </Button>
        </main>
      </div>
    )
  }

  const label = claim.supplierClaimType || "Risk"
  const relatedApprovals = approvals.slice(0, 3)
  const relatedTasks = tasks
    .filter((t) => t.requestId === lineId || t.claimId === lineId)
    .slice(0, 3)

  const upload = async () => {
    if (!file) return
    setTabError(null)
    const form = new FormData()
    form.append("file", file)
    form.append("fileType", fileType)
    form.append("description", fileDesc)
    try {
      const saved = await request<BackendAttachment>(
        `/api/claims/${encodeURIComponent(lineId)}/attachments`,
        { method: "POST", body: form }
      )
      setAttachments((a) => [...a, saved])
      setFile(null)
      setFileDesc("")
      refresh()
    } catch (e) {
      setTabError(e instanceof Error ? e.message : "Upload failed")
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-neutral-100">
      <NeoHeader active="home" />

      <div className="flex items-center justify-between bg-emerald-800 px-6 py-2.5 text-white">
        <h1 className="text-lg font-semibold">
          {label} - {claim.lineId}
        </h1>
        <div className="flex gap-2">
          <Link
            href="/create-claim"
            className="rounded border border-white/60 px-2 py-1 text-[11px] font-semibold hover:bg-white/10"
          >
            UPDATE CLAIM
          </Link>
          <Link
            href={`/mandate-request?claim=${encodeURIComponent(claim.lineId)}`}
            className="rounded border border-white/60 px-2 py-1 text-[11px] font-semibold hover:bg-white/10"
          >
            REQUEST FOR MANDATE
          </Link>
          <button
            type="button"
            className="rounded border border-white/60 px-2 py-1 text-[11px] font-semibold hover:bg-white/10"
          >
            BULK UPLOAD PARTS
          </button>
          <button
            type="button"
            className="rounded border border-white/60 px-2 py-1 text-[11px] font-semibold hover:bg-white/10"
          >
            •••
          </button>
        </div>
      </div>

      <nav className="flex gap-4 overflow-x-auto border-b border-neutral-200 bg-white px-6 text-xs">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "whitespace-nowrap py-2",
              t === tab
                ? "rounded bg-emerald-800 px-2 font-semibold text-white"
                : "text-neutral-500 hover:text-neutral-900"
            )}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="flex-1 px-6 py-4">
        <div className="rounded bg-white px-6 py-5 shadow-sm">
          {tab === "Summary" && (
            <div>
              <p className="text-[11px] text-neutral-500">Phase</p>
              <div className="mt-2 mb-1 flex items-center">
                {phases.map((p, i) => (
                  <div key={p} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "size-2 rotate-45 border border-emerald-800",
                          i <= 1 && "bg-emerald-800"
                        )}
                      />
                      <span className="mt-1 text-[10px] whitespace-nowrap text-neutral-500">
                        {p}
                      </span>
                    </div>
                    {i < phases.length - 1 && (
                      <span
                        className={cn(
                          "mx-1 mb-5 h-0.5 flex-1",
                          i < 1 ? "bg-emerald-800" : "bg-neutral-200"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-10">
                <div>
                  <p className="text-[11px] font-bold text-neutral-800">
                    Workflow Status
                  </p>
                  <p className="text-xs text-neutral-500">
                    {claim.status === "Forecast" ? "Created" : claim.status || "Created"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-neutral-800">
                    Finance Status
                  </p>
                  <p className="text-xs text-neutral-500">
                    {claim.status || "Forecast"}
                  </p>
                </div>
              </div>

              <SectionTitle>Core Data</SectionTitle>
              <div className="mt-2 grid grid-cols-2 gap-x-10 gap-y-3">
                <Kv label="Buyer Code" value={claim.buyerCode} />
                <Kv label="Buyer Name" value={claim.buyerName} />
                <Kv label="PM Code" value={claim.pmCode} />
                <Kv label="PM Name" value={claim.pmName} />
              </div>

              <SectionTitle>Claim Details</SectionTitle>
              <div className="mt-2 grid grid-cols-2 gap-x-10 gap-y-3">
                <Kv label="Supplier Claim Type" value={label} />
                <div>
                  <p className="text-[11px] font-bold text-neutral-800">
                    Confidential?
                  </p>
                  <p className="mt-0.5">
                    <CircleDot className="size-4 text-red-500" />
                  </p>
                </div>
                <Kv label="Fiscal Year" value={claim.fiscalYear} />
                <Kv label="Method of Notification" value="None" />
              </div>

              <SectionTitle>Vendor Details</SectionTitle>
              <div className="mt-2 grid grid-cols-1 gap-y-3">
                <Kv label="Vendor ⓘ" value={claim.vendorCode} />
                <Kv label="DT2 Vendor ⓘ" value="-" />
              </div>

              <SectionTitle>Basic Details</SectionTitle>
              <div className="mt-2 grid grid-cols-3 gap-x-10 gap-y-3">
                <Kv label="Transaction Type" value={claim.transactionType} />
                <Kv label="Effective Date" value={claim.implementationDate} />
                <Kv label="Transaction Type Breakdown" value="-" />
                <Kv label="Transaction Drivers" value="-" />
              </div>
            </div>
          )}

          {tab === "Calculations" && (
            <div className="grid grid-cols-2 gap-x-10 gap-y-3">
              <Kv label="Reporting Value (£)" value={claim.reportingValue} />
              <Kv label="Status" value={claim.status} />
              <Kv label="Fiscal Year" value={claim.fiscalYear} />
              <Kv label="Implementation Date" value={claim.implementationDate} />
            </div>
          )}

          {tab === "CO2" && (
            <div className="grid grid-cols-2 gap-x-10 gap-y-3">
              <Kv label="Co2e Start Position (kg)" value="-" />
              <Kv label="Co2e End Position (kg)" value="-" />
              <Kv label="Co2e Delta (kg)" value="-" />
              <Kv label="Co2e Change Date" value="-" />
            </div>
          )}

          {tab === "Inflation" && (
            <p className="text-xs text-neutral-500">
              No inflation records for this claim.
            </p>
          )}

          {tab === "Parts" && (
            <p className="text-xs text-neutral-500">
              No part details captured for this claim yet. Use Bulk Upload
              Parts to add them.
            </p>
          )}

          {tab === "Finance" && (
            <div className="grid grid-cols-2 gap-x-10 gap-y-3">
              <Kv label="Currency" value="USD" />
              <Kv label="Budget Exchange Rate" value="1.27" />
              <Kv label="Annual Forecast (£)" value={claim.reportingValue} />
              <Kv label="Calendarised Forecast (£)" value={claim.reportingValue} />
            </div>
          )}

          {tab === "Approval Requests" && (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Request Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Overall Status</TableHead>
                    <TableHead>DOA Approval Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedApprovals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-4 text-center text-xs text-neutral-500">
                        No approval requests linked to this claim yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {relatedApprovals.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-bold text-emerald-800">
                        {a.id}
                      </TableCell>
                      <TableCell>{a.requestType}</TableCell>
                      <TableCell>{a.category}</TableCell>
                      <TableCell>{a.overall}</TableCell>
                      <TableCell>{a.doa}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {tab === "Attachments" && (
            <div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <p className="mb-1 text-[11px] font-bold text-neutral-700">
                    File
                  </p>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="text-xs text-neutral-600"
                  />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-bold text-neutral-700">
                    File Type
                  </p>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="h-8 rounded border border-neutral-300 px-2 text-xs"
                  >
                    {[
                      "Email from Supplier",
                      "Quote",
                      "Purchase Order",
                      "Letter from Supplier",
                      "NDA",
                      "Other",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-[11px] font-bold text-neutral-700">
                    Description
                  </p>
                  <input
                    value={fileDesc}
                    onChange={(e) => setFileDesc(e.target.value)}
                    placeholder="Description (max 2000)"
                    maxLength={2000}
                    className="h-8 w-full rounded border border-neutral-300 px-2 text-xs"
                  />
                </div>
                <Button size="sm" type="button" onClick={upload} disabled={!file}>
                  Upload
                </Button>
              </div>
              {tabError && (
                <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {tabError}
                </p>
              )}
              <div className="mt-3 overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>File Type</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attachments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-4 text-center text-xs text-neutral-500">
                          No items available
                        </TableCell>
                      </TableRow>
                    )}
                    {attachments.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.fileName}</TableCell>
                        <TableCell>{d.fileType}</TableCell>
                        <TableCell>{d.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {tab === "Tasks" && (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedTasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-4 text-center text-xs text-neutral-500">
                        No workflow tasks for this claim yet. Submit the claim to start approvals.
                      </TableCell>
                    </TableRow>
                  )}
                  {relatedTasks.map((t) => (
                    <TableRow key={t.id ?? t.requestId}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.requestId}</TableCell>
                      <TableCell>{t.status}</TableCell>
                      <TableCell>{t.createdOn}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {tab === "Notes" && (
            <div>
              <form
                className="flex gap-2"
                onSubmit={noteForm.handleSubmit(async (v) => {
                  const text = v.note.trim()
                  try {
                    const saved = await request<BackendNote>(
                      `/api/claims/${encodeURIComponent(lineId)}/notes`,
                      { method: "POST", body: JSON.stringify({ note: text }) }
                    )
                    setBackendNotes((n) => [...n, saved])
                    refresh()
                  } catch {
                    setNotes((n) => [text, ...n])
                  }
                  noteForm.reset()
                })}
              >
                <div className="flex-1">
                  <Textarea
                    {...noteForm.register("note")}
                    placeholder="Add a note (max 1000 characters)"
                    maxLength={1000}
                    className="text-xs"
                    aria-invalid={!!noteForm.formState.errors.note}
                  />
                  <FieldError
                    message={noteForm.formState.errors.note?.message}
                  />
                </div>
                <Button size="sm" type="submit">
                  Add
                </Button>
              </form>
              <ul className="mt-3 space-y-2">
                {backendNotes.length === 0 && notes.length === 0 && (
                  <li className="text-xs text-neutral-500">No notes yet.</li>
                )}
                {backendNotes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded border border-neutral-200 px-3 py-2 text-xs"
                  >
                    {n.note}
                  </li>
                ))}
                {notes.map((n, i) => (
                  <li
                    key={`local-${i}`}
                    className="rounded border border-neutral-200 px-3 py-2 text-xs"
                  >
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "Activity Log" && (
            <ul className="space-y-2 text-xs text-neutral-600">
              {activity.length === 0 && (
                <>
                  <li>Created on {claim.createdOn}</li>
                  <li>Implementation date {claim.implementationDate}</li>
                </>
              )}
              {activity.map((a) => (
                <li key={`${a.action}-${a.createdOn}`}>
                  {a.action} — {a.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
