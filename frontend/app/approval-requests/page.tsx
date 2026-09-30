"use client"

import Link from "next/link"
import { useState } from "react"
import { Download, ListFilter, RotateCcw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NeoHeader } from "@/components/neo/neo-header"
import { useNeoStore } from "@/lib/neo-store"
import { cn } from "@/lib/utils"

function MiniSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string | null) => void
  options: string[]
}) {
  return (
    <div className="flex items-center gap-1 text-[11px]">
      <span className="font-semibold whitespace-nowrap text-neutral-500 uppercase">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 flex-1 border-0 bg-transparent px-1 text-[11px] shadow-none">
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__any">Any</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

const initialApprovals = {
  query: "",
  requestType: "__any",
  category: "__any",
  doa: "__any",
  clearing: "__any",
  coc: "__any",
  vendor: "__any",
}

export default function ApprovalRequestsPage() {
  const { approvals } = useNeoStore()
  const [f, setF] = useState(initialApprovals)
  const set = (k: keyof typeof initialApprovals) => (v: string | null) =>
    setF((p) => ({ ...p, [k]: v ?? "__any" }))

  const rows = approvals.filter((a) => {
    const any = (v: string) => v === "__any" || v === ""
    if (f.query) {
      const q = f.query.toLowerCase()
      if (
        !`${a.id} ${a.requestType} ${a.category} ${a.vendorName} ${a.raiser}`.toLowerCase().includes(q)
      )
        return false
    }
    if (!any(f.requestType) && a.requestType !== f.requestType) return false
    if (!any(f.category) && a.category !== f.category) return false
    if (!any(f.doa) && a.doa !== f.doa) return false
    return true
  })

  return (
    <div className="flex min-h-svh flex-col bg-neutral-100">
      <NeoHeader active="approval" />

      <main className="flex-1 space-y-0 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button className="h-8 flex-1 bg-emerald-800 text-[11px] font-bold text-white hover:bg-emerald-700">
            ⟳ CREATE AD-HOC APPROVAL REQUEST
          </Button>
          <Button className="h-8 flex-1 bg-emerald-800 text-[11px] font-bold text-white hover:bg-emerald-700">
            + CREATE TRADING DIVISION REQUEST
          </Button>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-emerald-700 text-[11px] font-bold text-emerald-700"
            >
              PENDING APPROVALS
            </Button>
            <Link
              href="/approval-requests"
              className="inline-flex h-8 items-center rounded-lg border border-emerald-700 px-2.5 text-[11px] font-bold text-emerald-700"
            >
              MY APPROVALS
            </Link>
          </div>
        </div>

        <div className="mt-2 border border-neutral-200 bg-white px-3 py-2">
          <div className="grid grid-cols-2 items-center gap-x-3 gap-y-1.5 lg:grid-cols-4">
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-neutral-400" />
                <Input
                  value={f.query}
                  onChange={(e) => setF({ ...f, query: e.target.value })}
                  placeholder="Search Requests"
                  className="h-7 border-neutral-300 pl-7 text-[11px]"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                type="submit"
                className="h-7 border-emerald-700 px-2 text-[11px] font-bold text-emerald-700"
              >
                SEARCH
              </Button>
            </form>
            <MiniSelect
              label="REQUEST TYPE |"
              value={f.requestType}
              onChange={set("requestType")}
              options={["Mandate", "Settlement"]}
            />
            <MiniSelect
              label="REQUEST CATEGORY |"
              value={f.category}
              onChange={set("category")}
              options={["Prompt Payment", "Inflation"]}
            />
            <div className="flex items-center gap-1">
              <div className="flex-1">
                <MiniSelect
                  label="DOA APPROVAL STATUS |"
                  value={f.doa}
                  onChange={set("doa")}
                  options={["Submitted", "Complete", "Draft"]}
                />
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Button size="icon-sm" variant="outline" className="size-7" type="button" title="Export">
                  <Download className="size-3.5" />
                </Button>
                <Button size="icon-sm" variant="outline" className="size-7" type="button" title="Column chooser">
                  <ListFilter className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="outline"
                  className="size-7"
                  type="button"
                  title="Reset"
                  onClick={() => setF(initialApprovals)}
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
            </div>
            <MiniSelect
              label="CLEARING HOUSE STATUS |"
              value={f.clearing}
              onChange={set("clearing")}
              options={["Awaiting More Information"]}
            />
            <MiniSelect
              label="COC |"
              value={f.coc}
              onChange={set("coc")}
              options={["ZZ COC Test"]}
            />
            <MiniSelect
              label="AGENDA DATE |"
              value="__any"
              onChange={() => {}}
              options={[]}
            />
            <MiniSelect
              label="VENDOR CODE |"
              value={f.vendor}
              onChange={set("vendor")}
              options={["GJFTA"]}
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-t-0 border-neutral-200 bg-white">
          <Table className="min-w-[1700px] text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {[
                  "ID",
                  "Request Type",
                  "Category",
                  "Level of Forum Required",
                  "Overall Status",
                  "Clearing House Status",
                  "DOA Approval Status",
                  "Value Including VAT (£)",
                  "Initial Request Total Value",
                  "Total Value (Risks)",
                  "Total Value (Opportunities)",
                  "Vendor Code",
                  "Vendor Name",
                  "CoC",
                  "Raiser CDSID",
                  "Other stakeholders",
                  "Days Pending Approval",
                  "Open Enquiries?",
                  "Action Outside SLA?",
                  "Age Dat",
                ].map((h, i) => (
                  <TableHead
                    key={h}
                    className="px-2 py-2 text-[11px] font-semibold whitespace-nowrap text-neutral-600"
                  >
                    {i === 0 ? (
                      <span className="inline-flex items-center gap-1">
                        {h} <span className="text-emerald-700">↓</span>
                      </span>
                    ) : (
                      h
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={20} className="py-8 text-center text-xs text-neutral-500">
                    No requests match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.id} className="align-top">
                    <TableCell className="px-2 py-2.5 font-bold text-emerald-800">
                      {a.id}
                    </TableCell>
                    <TableCell className="px-2 py-2.5">{a.requestType}</TableCell>
                    <TableCell className="px-2 py-2.5">{a.category}</TableCell>
                    <TableCell className="px-2 py-2.5 whitespace-normal">
                      {a.level}
                    </TableCell>
                    <TableCell className="px-2 py-2.5 whitespace-normal">
                      {a.overall}
                    </TableCell>
                    <TableCell className="px-2 py-2.5 whitespace-normal">
                      {a.clearing}
                    </TableCell>
                    <TableCell className="px-2 py-2.5">{a.doa}</TableCell>
                    <TableCell className="px-2 py-2.5">{a.valueVat}</TableCell>
                    <TableCell className="px-2 py-2.5">{a.initialTotal}</TableCell>
                    <TableCell
                      className={cn(
                        "px-2 py-2.5 whitespace-nowrap",
                        a.risksNegative && "text-red-500"
                      )}
                    >
                      {a.risks}
                    </TableCell>
                    <TableCell className="px-2 py-2.5">{a.opportunities}</TableCell>
                    <TableCell className="px-2 py-2.5">{a.vendorCode}</TableCell>
                    <TableCell className="px-2 py-2.5 uppercase">
                      {a.vendorName}
                    </TableCell>
                    <TableCell className="px-2 py-2.5 whitespace-normal">
                      {a.coc}
                    </TableCell>
                    <TableCell className="px-2 py-2.5">{a.raiser}</TableCell>
                    <TableCell className="px-2 py-2.5">{a.stakeholders}</TableCell>
                    <TableCell className="px-2 py-2.5">{a.daysPending}</TableCell>
                    <TableCell className="px-2 py-2.5">{a.openEnquiries}</TableCell>
                    <TableCell className="px-2 py-2.5">{a.actionOutside}</TableCell>
                    <TableCell className="px-2 py-2.5 whitespace-nowrap">
                      {a.ageDate}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  )
}
