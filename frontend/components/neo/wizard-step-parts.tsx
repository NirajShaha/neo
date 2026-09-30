"use client"

import { useState } from "react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { format } from "date-fns"
import { CalendarDays, Check, CircleDot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import {
  ControlledCheckRow,
  ControlledCountInput,
  ControlledRadioInline,
  FieldError,
  FieldLabel,
} from "@/components/neo/wizard-fields"
import {
  absoluteChange,
  initialPartDetail,
  partNumbers,
  pctChange,
  plants,
  priceSign,
} from "@/lib/neo-wizard"
import type { WizardValues } from "@/lib/neo-schemas"
import { cn } from "@/lib/utils"

function PlantSelect({
  part,
  value,
  onChange,
  options,
}: {
  part: string
  value: string
  onChange: (plant: string) => void
  options: string[]
}) {
  return (
    <div>
      <Select
        value={value || undefined}
        onValueChange={(v) => onChange(v ?? "")}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue placeholder="-- Please Select Plant --" />
        </SelectTrigger>
        <SelectContent>
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

function PartPicker({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (p: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <FieldLabel>Part</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                "h-8 w-full justify-between text-xs font-normal",
                selected.length === 0 && "text-neutral-400"
              )}
            >
              <span className="truncate">
                {selected.length === 0
                  ? "-- Please Select Part --"
                  : selected.join(", ")}
              </span>
              <span className="ml-2 flex size-4 items-center justify-center rounded-full bg-emerald-700 text-[10px] text-white">
                {selected.length > 0 ? <Check className="size-3" /> : null}
              </span>
            </Button>
          }
        />
        <PopoverContent align="start" className="w-80 p-0">
          <Command>
            <CommandInput placeholder="Search" />
            <CommandList>
              <CommandEmpty>No parts found.</CommandEmpty>
              <CommandGroup>
                {partNumbers.map((p) => (
                  <CommandItem
                    key={p}
                    value={p}
                    onSelect={() => onToggle(p)}
                    className="text-xs"
                  >
                    {p}
                    {selected.includes(p) && (
                      <Check className="ml-auto size-3.5 text-emerald-700" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function CellInput({
  value,
  onChange,
  placeholder,
  className,
  error,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  error?: string
}) {
  return (
    <div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={cn(
          "h-7 min-w-24 text-xs",
          error && "border-red-500",
          className
        )}
      />
      {error && (
        <p role="alert" className="mt-0.5 text-[10px] font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

function RunoutDateCell({
  value,
  onChange,
  enabled,
}: {
  value: Date | undefined
  onChange: (d: Date | undefined) => void
  enabled: boolean
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={!enabled}
            className={cn(
              "h-7 w-28 justify-start px-2 text-xs font-normal",
              !value && "text-neutral-400"
            )}
          >
            {value ? format(value, "dd/MM/yyyy") : "-"}
            <CalendarDays className="ml-auto size-3.5 text-neutral-500" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  )
}

export function PartsStep() {
  const { control, setValue, getValues } = useFormContext<WizardValues>()
  const parts = useWatch({ control, name: "parts" }) ?? []
  const partPlants = useWatch({ control, name: "partPlants" }) ?? {}
  const generated = useWatch({ control, name: "generated" }) ?? false
  const allPct = useWatch({ control, name: "allPct" }) ?? ""
  const allAbs = useWatch({ control, name: "allAbs" }) ?? ""
  const { fields: detailFields, replace } = useFieldArray({
    control,
    name: "partDetails",
  })

  const togglePart = (p: string) => {
    const next = parts.includes(p)
      ? parts.filter((x) => x !== p)
      : [...parts, p]
    setValue("parts", next, { shouldValidate: true })
    setValue("generated", false)
  }

  const setDetail = (idx: number, patch: Record<string, unknown>) => {
    const current = getValues("partDetails")
    const row = current[idx]
    if (!row) return
    setValue(`partDetails.${idx}` as never, { ...row, ...patch } as never, {
      shouldValidate: true,
    })
  }

  const generate = () => {
    const current = getValues("partDetails")
    const details = parts.map((p) => {
      const prev = current.find((d) => d.part === p)
      return (
        prev ?? {
          ...initialPartDetail(p, partPlants[p] ?? plants[0]),
          description: p === "L8B29K335CC" ? "TUB ASY-FUL" : "Test",
        }
      )
    })
    replace(details)
    setValue("generated", true, { shouldValidate: true })
  }

  const applyAllPct = (pctRaw: string) => {
    setValue("allPct", pctRaw, { shouldValidate: true })
    const pct = parseFloat(pctRaw)
    if (!Number.isFinite(pct)) return
    const current = getValues("partDetails")
    setValue(
      "partDetails",
      current.map((d) => {
        const c = parseFloat(d.currentPrice)
        if (!Number.isFinite(c)) return d
        return {
          ...d,
          newPrice: (c * (1 - pct / 100)).toLocaleString("en-GB", {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
          }),
        }
      }),
      { shouldValidate: true }
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-4">
      <div>
        <FieldLabel>System to Update</FieldLabel>
        <ControlledRadioInline<WizardValues>
          name="systemUpdate"
          control={control}
          options={["WIPS", "EMC"]}
        />
      </div>
      <ControlledCountInput<WizardValues>
        id="claimtitle"
        label="Claim Title"
        required
        hint="Max 20 characters (CLAIM_TITLE)"
        name="claimTitle"
        control={control}
        max={20}
        placeholder="claim title"
      />
      <ControlledCountInput<WizardValues>
        id="wipsclaim"
        label="WIPS Claim Number"
        hint="Max 20 characters (WIPS_CLAIM_NUMBER)"
        name="wipsClaimNumber"
        control={control}
        max={20}
        placeholder="WIPS claim number"
      />

      <PartPicker selected={parts} onToggle={togglePart} />
      <ControlledCheckRow<WizardValues>
        name="showAllParts"
        control={control}
        label="Show all Part(s)"
      />

      {parts.length > 0 && (
        <div className="col-span-2">
          <p className="mb-1 text-[11px] font-bold text-neutral-700">
            Select Plant
          </p>
          <div className="border border-neutral-200">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold text-neutral-600">
                    Part Number(s)
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-neutral-600">
                    Plant
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((p) => (
                  <TableRow key={p} className="hover:bg-transparent">
                    <TableCell>{p}</TableCell>
                    <TableCell>
                      <PlantSelect
                        part={p}
                        value={partPlants[p] ?? ""}
                        onChange={(plant) => {
                          const next = plant
                            ? { ...partPlants, [p]: plant }
                            : { ...partPlants }
                          if (!plant) delete next[p]
                          setValue("partPlants", next, { shouldValidate: true })
                          setValue("generated", false)
                        }}
                        options={plants}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-1 flex items-center justify-end gap-2">
            <span className="text-[11px] text-neutral-500">
              {parts.length} items
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => {
                setValue("parts", [], { shouldValidate: true })
                replace([])
                setValue("generated", false)
              }}
            >
              RESET SELECTION
            </Button>
            <Button size="sm" className="h-7 text-[11px]" onClick={generate}>
              GENERATE PART DETAILS
            </Button>
          </div>
        </div>
      )}

      {generated && detailFields.length > 0 && (
        <div className="col-span-2">
          <div className="grid grid-cols-2 gap-x-10">
            <div>
              <FieldLabel hint="Apply to every row">
                All % Difference
              </FieldLabel>
              <Input
                value={allPct}
                onChange={(e) => applyAllPct(e.target.value)}
                placeholder="All % Difference"
                inputMode="decimal"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <FieldLabel hint="Apply to every row">
                All Absolute Price Change
              </FieldLabel>
              <Input
                value={allAbs}
                onChange={(e) =>
                  setValue("allAbs", e.target.value, { shouldValidate: true })
                }
                placeholder="All Absolute Price Change"
                inputMode="decimal"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <p className="mt-4 mb-1 text-[11px] font-bold text-neutral-700">
            Part Details
          </p>
          <div className="overflow-x-auto border border-neutral-200">
            <Table className="min-w-[1500px] text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {[
                    "Part Number(s)",
                    "Plant",
                    "Current Price",
                    "Current Price Changed?",
                    "Current Value Currency",
                    "Description",
                    "New Part price",
                    "New Part price currency",
                    "Absolute Part Price Change",
                    "Part Price Change Sign",
                    "% Difference",
                    "Runout",
                    "Runout Date",
                    "ATP Reference",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="px-2 py-2 text-[11px] font-semibold whitespace-nowrap text-neutral-600"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailFields.map((field, i) => {
                  const d = getValues("partDetails")[i]
                  if (!d) return null
                  return (
                    <TableRow key={field.id} className="align-top">
                      <TableCell className="px-2 py-1.5 whitespace-nowrap">
                        {d.part}
                      </TableCell>
                      <TableCell className="px-2 py-1.5 whitespace-nowrap">
                        {d.plant}
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <CellInput
                          value={d.currentPrice}
                          onChange={(v) => setDetail(i, { currentPrice: v })}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-center">
                        <CircleDot className="inline size-4 text-red-500" />
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <CellInput
                          value={d.currentCurrency}
                          onChange={(v) => setDetail(i, { currentCurrency: v })}
                          className="min-w-16"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <CellInput
                          value={d.description}
                          onChange={(v) => setDetail(i, { description: v })}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <CellInput
                          value={d.newPrice}
                          onChange={(v) => setDetail(i, { newPrice: v })}
                          placeholder="New Part pric"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <CellInput
                          value={d.newCurrency}
                          onChange={(v) => setDetail(i, { newCurrency: v })}
                          className="min-w-16"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <CellInput
                          value={
                            d.newPrice ? absoluteChange(d) : "Absolute Part"
                          }
                          onChange={() => {}}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5 text-center text-lg font-bold text-red-600">
                        {priceSign(d)}
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <CellInput
                          value={d.newPrice ? pctChange(d) : "% Difference"}
                          onChange={() => {}}
                          className="min-w-20"
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <ControlledRadioInline<WizardValues>
                          name={`partDetails.${i}.runout` as never}
                          control={control}
                          options={["Yes", "No"]}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <RunoutDateCell
                          value={d.runoutDate}
                          onChange={(dt) => setDetail(i, { runoutDate: dt })}
                          enabled={d.runout === "Yes"}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1.5">
                        <CellInput
                          value={d.atpRef}
                          onChange={(v) => setDetail(i, { atpRef: v })}
                          placeholder="ATP Referenc"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-1 text-right text-[11px] text-neutral-500">
            {detailFields.length} items
          </p>
        </div>
      )}
    </div>
  )
}
