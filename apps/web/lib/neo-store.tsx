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
import type { ClaimData, ClaimRow } from "@/lib/neo-data"
import { claims as seedClaims } from "@/lib/neo-data"

export type PendingApprovalItem = {
  taskId: string
  taskName: string
  taskKey: string
  requestId: string | null
  requestType: string
  description: string | null
  vendorName: string | null
  value: string | null
  raisedById: string | null
  raisedByName: string | null
  createdOn: string | null
  canAct: boolean
  candidateGroups: string[]
}

export type ApprovalDecisionRow = {
  taskId: string
  requestId: string
  requestType: string
  taskName: string
  decision: string
  comment: string | null
  actorId: string | null
  actorName: string | null
  decidedOn: string | null
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
  payload?: string
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

function parseClaimData(payload?: string): ClaimData | undefined {
  if (!payload) return undefined
  try {
    const parsed = JSON.parse(payload)
    return parsed && typeof parsed === "object"
      ? (parsed as ClaimData)
      : undefined
  } catch {
    return undefined
  }
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
    data: parseClaimData(c.payload),
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
  pendingApprovals: PendingApprovalItem[]
  myApprovals: ApprovalDecisionRow[]
  version: number
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
  const [pendingApprovals, setPendingApprovals] = useState<
    PendingApprovalItem[]
  >([])
  const [myApprovals, setMyApprovals] = useState<ApprovalDecisionRow[]>([])
  const [backendApprovals, setBackendApprovals] = useState<ApprovalRow[]>([])
  const [version, setVersion] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [extra, setExtra] = useState<ClaimRow[]>([])
  const [extraApprovals, setExtraApprovals] = useState<ApprovalRow[]>([])
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    const load = async (sections?: Set<string>) => {
      try {
        const response = await fetch(backendPath("/bootstrap"), {
          cache: "no-store",
        })
        if (response.status === 401) {
          if (!cancelled) router.refresh()
          return
        }
        if (!response.ok) return
        const body = (await response.json()) as {
          claims: BackendClaim[]
          pendingApprovals: PendingApprovalItem[]
          decidedApprovals: ApprovalDecisionRow[]
          mandateApprovals: BackendApproval[]
          notifications: { items: NotificationItem[] } | NotificationItem[]
        }
        const all = !sections || sections.has("all")
        if (!cancelled && (all || sections?.has("claims")))
          setBackendClaims((body.claims ?? []).map(toClaimRow))
        if (!cancelled && (all || sections?.has("approvals"))) {
          setPendingApprovals(body.pendingApprovals ?? [])
          setMyApprovals(body.decidedApprovals ?? [])
          setBackendApprovals((body.mandateApprovals ?? []).map(toApprovalRow))
        }
        if (!cancelled && (all || sections?.has("notifications"))) {
          const items = Array.isArray(body.notifications)
            ? body.notifications
            : body.notifications?.items
          setNotifications(items ?? [])
        }
        if (!cancelled) setVersion((v) => v + 1)
      } catch {
        /* Reconnect and the next workflow event will retry the targeted load. */
      }
    }
    load()
    const seen = new Set<string>()
    const source = new EventSource(backendPath("/events/stream"))
    const refreshFor = (event: MessageEvent) => {
      if (event.lastEventId && seen.has(event.lastEventId)) return
      if (event.lastEventId) {
        seen.add(event.lastEventId)
        if (seen.size > 200) seen.delete(seen.values().next().value as string)
      }
      if (event.type === "notification")
        load(new Set(["approvals", "claims", "notifications"]))
      else if (event.type !== "connected")
        load(new Set(["approvals", "claims"]))
    }
    source.addEventListener("notification", refreshFor)
    source.addEventListener("workflow", refreshFor)
    source.addEventListener("connected", refreshFor)
    source.onerror = () => {
      if (!cancelled) load(new Set(["approvals", "claims", "notifications"]))
    }
    return () => {
      cancelled = true
      source.close()
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
      pendingApprovals,
      myApprovals,
      version,
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
    pendingApprovals,
    myApprovals,
    version,
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
