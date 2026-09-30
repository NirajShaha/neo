"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { backendPath } from "@/lib/constants"
import type { ClaimRow } from "@/lib/neo-data"
import { claims as seedClaims } from "@/lib/neo-data"

export type TaskRow = {
  id?: string
  name: string
  requestId: string
  claimId: string
  status: string
  sla: string
  slaOverdue?: boolean
  context: string
  comments: string
  createdOn: string
  completedBy: string
  completedOn: string
  taskKey?: string
  candidateGroups?: string[]
}

export type ApprovalRow = {
  id: string
  requestType: string
  category: string
  level: string
  overall: string
  clearing: string
  doa: string
  valueVat: string
  initialTotal: string
  risks: string
  risksNegative?: boolean
  opportunities: string
  vendorCode: string
  vendorName: string
  coc: string
  raiser: string
  stakeholders: string
  daysPending: string
  openEnquiries: string
  actionOutside: string
  ageDate: string
}

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  refType?: string | null
  refId?: string | null
  createdOn?: string
}

export type MandateClaim = {
  lineId: string
  supplierClaimType: string
  createdOn: string
  fiscalYear: string
  buyerCode: string
  buyerName: string
  pmCode: string
  pmName: string
  coc: string
  vendorCode: string
  vendorName: string
  dt2VendorCode: string
  description: string
  implementationDate: string
  reportingValue: string
  status: string
  nonStandard: string
  isReserve: boolean
}

export type MandateForm = {
  problem: string
  details: string
  fbp: string
  reds: string
  proposedChanges: string
  mainRisk: string
  category: string
  audit: string
  stakeholders: string
  ariba: string
}

export const initialMandateForm: MandateForm = {
  problem: "",
  details: "",
  fbp: "FBP Officer",
  reds: "",
  proposedChanges: "",
  mainRisk: "",
  category: "",
  audit: "",
  stakeholders: "",
  ariba: "",
}

type BackendClaim = {
  lineId: string
  parentId?: string
  supplierClaimType?: string
  transactionType?: string
  fiscalYear?: string
  coc?: string
  confidential?: boolean
  vendorName?: string
  vendorCode?: string
  description?: string
  reportingValue?: string
  reportingNegative?: boolean
  status?: string
  createdOn?: string
  implementationDate?: string
  reserve?: boolean
  buyerCode?: string
  buyerName?: string
  pmCode?: string
  pmName?: string
}

type BackendTask = {
  taskId: string
  name?: string
  taskDefinitionKey?: string
  businessKey?: string
  assignee?: string | null
  candidateGroups?: string[]
  createdTime?: string
}

type BackendApproval = {
  id: string
  requestType?: string
  category?: string
  level?: string
  overall?: string
  clearing?: string
  doa?: string
  valueVat?: string
  initialTotal?: string
  risks?: string
  risksNegative?: boolean
  opportunities?: string
  vendorCode?: string
  vendorName?: string
  coc?: string
  raiser?: string
  stakeholders?: string
  daysPending?: string
  openEnquiries?: string
  actionOutside?: string
  ageDate?: string
}

function fmtDateTime(value?: string) {
  if (!value) return ""
  try {
    return new Date(value)
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      .toUpperCase()
  } catch {
    return value
  }
}

function fmtDateOnly(value?: string) {
  if (!value) return ""
  if (!/\d{4}-\d{2}-\d{2}/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase()
}

function toClaimRow(c: BackendClaim): ClaimRow {
  return {
    lineId: c.lineId,
    parentId: c.parentId ?? "",
    supplierClaimType: c.supplierClaimType ?? "",
    transactionType: c.transactionType ?? "",
    fiscalYear: c.fiscalYear ?? "2024-2025",
    coc: c.coc ?? "ZZ COC Test",
    confidential: c.confidential ?? false,
    vendorName: c.vendorName ?? "",
    vendorCode: c.vendorCode ?? "",
    description: c.description ?? "",
    reportingValue: c.reportingValue ?? "0.0000",
    reportingNegative: c.reportingNegative,
    status: c.status ?? "Draft",
    createdOn: fmtDateTime(c.createdOn),
    implementationDate: fmtDateOnly(c.implementationDate),
    isReserve: c.reserve ?? false,
    buyerCode: c.buyerCode ?? "ZZ0X",
    buyerName: c.buyerName ?? "Buyer Officer",
    pmCode: c.pmCode ?? "ZZ1X",
    pmName: c.pmName ?? "Purchasing Manager",
  }
}

function toTaskRow(t: BackendTask): TaskRow {
  const key = t.taskDefinitionKey ?? ""
  return {
    id: t.taskId,
    name: t.name ?? key,
    requestId: t.businessKey ?? "",
    claimId: t.businessKey ?? "",
    status: "Open",
    sla: "",
    context:
      key.includes("finance") || key.includes("doa")
        ? "Finance approval"
        : key.includes("clearing")
          ? "Clearing review"
          : "Manager approval",
    comments: t.assignee ? `Assigned to ${t.assignee}` : "Awaiting action",
    createdOn: fmtDateTime(t.createdTime),
    completedBy: "",
    completedOn: "",
    taskKey: key,
    candidateGroups: t.candidateGroups ?? [],
  }
}

function toApprovalRow(a: BackendApproval): ApprovalRow {
  return {
    id: a.id,
    requestType: a.requestType ?? "Mandate",
    category: a.category ?? "",
    level: a.level ?? "Local Clearing House",
    overall: a.overall ?? "",
    clearing: a.clearing ?? "",
    doa: a.doa ?? "",
    valueVat: a.valueVat ?? "",
    initialTotal: a.initialTotal ?? "-",
    risks: a.risks ?? "",
    risksNegative: a.risksNegative,
    opportunities: a.opportunities ?? "",
    vendorCode: a.vendorCode ?? "",
    vendorName: a.vendorName ?? "",
    coc: a.coc ?? "",
    raiser: a.raiser ?? "",
    stakeholders: a.stakeholders ?? "",
    daysPending: a.daysPending ?? "0",
    openEnquiries: a.openEnquiries ?? "",
    actionOutside: a.actionOutside ?? "",
    ageDate: a.ageDate ?? "",
  }
}

type Store = {
  claims: ClaimRow[]
  addClaim: (c: ClaimRow) => void
  nextLineId: () => string
  tasks: TaskRow[]
  approvals: ApprovalRow[]
  addApproval: (a: ApprovalRow) => void
  notifications: NotificationItem[]
  unreadCount: number
  refresh: () => void
  completeTask: (
    taskId: string,
    decision: "APPROVED" | "REJECTED",
    comment?: string
  ) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
}

const Ctx = createContext<Store | null>(null)

export function NeoStoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [backendClaims, setBackendClaims] = useState<ClaimRow[]>([])
  const [backendTasks, setBackendTasks] = useState<TaskRow[]>([])
  const [backendApprovals, setBackendApprovals] = useState<ApprovalRow[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [extra, setExtra] = useState<ClaimRow[]>([])
  const [extraApprovals, setExtraApprovals] = useState<ApprovalRow[]>([])
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [claimsRes, tasksRes, approvalsRes, notificationsRes] =
          await Promise.all([
            fetch(backendPath("/claims")),
            fetch(backendPath("/tasks")),
            fetch(backendPath("/mandates/approvals/view")),
            fetch(backendPath("/notifications")),
          ])
        if (claimsRes.status === 401) {
          if (!cancelled) router.refresh()
          return
        }
        if (claimsRes.ok) {
          const rows = (await claimsRes.json()) as BackendClaim[]
          if (!cancelled) setBackendClaims(rows.map(toClaimRow))
        }
        if (tasksRes.ok) {
          const rows = (await tasksRes.json()) as BackendTask[]
          if (!cancelled) setBackendTasks(rows.map(toTaskRow))
        }
        if (approvalsRes.ok) {
          const rows = (await approvalsRes.json()) as BackendApproval[]
          if (!cancelled) setBackendApprovals(rows.map(toApprovalRow))
        }
        if (notificationsRes.ok) {
          const body = (await notificationsRes.json()) as {
            items: NotificationItem[]
          }
          if (!cancelled) setNotifications(body.items ?? [])
        }
      } catch {
        /* backend unavailable: seed fallback stays */
      }
    }
    load()
    const timer = setInterval(load, 15000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [tick, router])

  const completeTask = useCallback(
    async (
      taskId: string,
      decision: "APPROVED" | "REJECTED",
      comment?: string
    ) => {
      const response = await fetch(backendPath(`/tasks/${taskId}/complete`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment: comment ?? null }),
      })
      if (!response.ok) throw new Error("Failed to complete task")
      refresh()
    },
    [refresh]
  )

  const markAllNotificationsRead = useCallback(async () => {
    await fetch(backendPath("/notifications/read-all"), { method: "POST" })
    setNotifications((items) => items.map((n) => ({ ...n, read: true })))
  }, [])

  const value = useMemo<Store>(() => {
    const claims = [...extra, ...backendClaims, ...seedClaims]
    return {
      claims,
      addClaim: (c) => setExtra((e) => [...e, c]),
      nextLineId: () => {
        const nums = claims.map((c) =>
          parseInt(c.lineId.split("-")[1] ?? "0", 10)
        )
        const max = Math.max(0, ...nums.filter((n) => Number.isFinite(n)))
        return `MCI-${String(max + 1).padStart(5, "0")}`
      },
      tasks: backendTasks,
      approvals: [...backendApprovals, ...extraApprovals],
      addApproval: (a) => setExtraApprovals((e) => [a, ...e]),
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      refresh,
      completeTask,
      markAllNotificationsRead,
    }
  }, [
    extra,
    extraApprovals,
    backendClaims,
    backendTasks,
    backendApprovals,
    notifications,
    refresh,
    completeTask,
    markAllNotificationsRead,
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNeoStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error("useNeoStore must be used inside NeoStoreProvider")
  return s
}
