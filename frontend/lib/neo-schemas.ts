import { z } from "zod"

const required = (label: string) => z.string().min(1, `${label} is required`)

const optionalDate = z.date().optional()

const bounded = (label: string, max: number) =>
  z.string().max(max, `${label} must be ${max} characters or less`).default("")

const numericText = (label: string) =>
  z
    .string()
    .regex(
      /^\d+(\.\d{1,5})?$/,
      `${label} must be a valid number (max 5 decimals)`
    )
    .or(z.literal(""))
    .default("")

const gtinLike = (label: string) =>
  z
    .string()
    .regex(/^[A-Za-z0-9-]+$/, `${label} contains invalid characters`)
    .or(z.literal(""))
    .default("")

export const coreSchema = z.object({
  onBehalf: z.boolean().default(false),
  buyerCode: required("Buyer Code"),
})

export const claimSchema = z
  .object({
    claimType: z.enum(["Risk", "Opportunity"], {
      message: "Supplier Claim Type is required",
    }),
    confidential: z.enum(["Yes", "No"]).optional().default("No"),
    fiscalYear: required("Fiscal Year"),
    notification: required("Method of Notification"),
    vendor: required("Vendor"),
    showAllVendors: z.boolean().default(false),
    dt2Vendor: z.string().default(""),
    showAllDt2: z.boolean().default(false),
    transactionType: z.enum(["Lump Sum", "POA"], {
      message: "Transaction Type is required",
    }),
    transactionDrivers: z.string().default(""),
    transactionStart: optionalDate,
    transactionEnd: optionalDate,
    nonStandardFlag: z.string().default(""),
    lever: required("Lever"),
    myaRef: bounded("MYA Reference", 255),
    scpaRef: bounded("SCPA Reference", 255),
    goodsReceipt: optionalDate,
    implementation: z.date({ message: "Implementation Date is required" }),
    description: z
      .string()
      .min(1, "Description is required")
      .max(2000, "Description must be 2000 characters or less"),
    system: required("System"),
    strategicBuyer: z.string().default(""),
    commodityArea: z.string().default(""),
    maturity: z.enum(
      [
        "0 - Placeholder",
        "1 - Claim Initiated",
        "2 - Negotiation",
        "3 - Deal Agreed in Principle",
        "4 - Deal Signed",
      ],
      { message: "Maturity Status is required" }
    ),
    likelihood: z.enum(
      ["Closed", "Contractual", "Possible", "Probable", "Remote"],
      { message: "Likelihood is required" }
    ),
    annualForecastLocal: z
      .string()
      .min(1, "Annual Forecast Local is required")
      .regex(
        /^\d+(\.\d{1,5})?$/,
        "Annual Forecast Local must be a valid number (max 5 decimals)"
      ),
    grossClaimLocal: z
      .string()
      .min(1, "Gross Claim Local is required")
      .regex(
        /^\d+(\.\d{1,5})?$/,
        "Gross Claim Local must be a valid number (max 5 decimals)"
      ),
  })
  .superRefine((v, ctx) => {
    if (v.transactionType === "Lump Sum") {
      if (!v.transactionStart) {
        ctx.addIssue({
          code: "custom",
          message: "Transaction Start Date is required for Lump Sum",
          path: ["transactionStart"],
        })
      }
      if (!v.transactionEnd) {
        ctx.addIssue({
          code: "custom",
          message: "Transaction End Date is required for Lump Sum",
          path: ["transactionEnd"],
        })
      }
      if (
        v.transactionStart &&
        v.transactionEnd &&
        v.transactionEnd < v.transactionStart
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Transaction End Date must be on or after Start Date",
          path: ["transactionEnd"],
        })
      }
    }
  })

const docSchema = z.object({
  name: z.string().min(1, "File name is required").max(255),
  type: required("File Type"),
  description: bounded("Description", 2000),
})

export const documentsSchema = z.object({
  docs: z.array(docSchema).default([]),
})

export const co2Schema = z.object({
  co2Start: numericText("Co2e Start Position"),
  co2End: numericText("Co2e End Position"),
  co2Change: optionalDate,
})

export const lumpSumSchema = z.object({
  materialGroup: z.string().default(""),
  vehicleLine: z.string().default(""),
  manualInvoice: z.enum(["Yes", "No"]).optional().default("No"),
  manualInvoiceNo: bounded("Manual Invoice Number", 255),
  purchOrg: z.string().default(""),
  purchGroup: z.string().default(""),
  companyCode: z.string().default(""),
  plant: z.string().default(""),
  sapLsp: bounded("SAP LSP Reference", 255),
  poDesc: bounded("PO Description", 40),
})

const runoutValues = ["", "Yes", "No"] as const

export const partDetailSchema = z.object({
  part: gtinLike("Part").or(z.string().min(1, "Part is required")),
  plant: z.string().default(""),
  currentPrice: z
    .string()
    .min(1, "Current Price is required")
    .regex(
      /^\d+(\.\d{1,5})?$/,
      "Current Price must be a valid number (max 5 decimals)"
    ),
  currentPriceChanged: z.boolean().default(false),
  currentCurrency: z
    .string()
    .min(1, "Currency is required")
    .max(3, "Currency must be a 3-letter code")
    .default("EUR"),
  description: bounded("Description", 255),
  newPrice: numericText("New Part price"),
  newCurrency: z
    .string()
    .max(3, "Currency must be a 3-letter code")
    .default("EUR"),
  runout: z.enum(runoutValues).default(""),
  runoutDate: optionalDate,
  atpRef: bounded("ATP Reference", 255),
})

export const partsSchema = z
  .object({
    systemUpdate: z.enum(["WIPS", "EMC"]).default("WIPS"),
    claimTitle: z
      .string()
      .min(1, "Claim Title is required")
      .max(20, "Claim Title must be 20 characters or less (CLAIM_TITLE)"),
    wipsClaimNumber: bounded("WIPS Claim Number", 20),
    parts: z.array(z.string().min(1)).default([]),
    showAllParts: z.boolean().default(false),
    partPlants: z.record(z.string(), z.string()).default({}),
    partDetails: z.array(partDetailSchema).default([]),
    allPct: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "All % Difference must be a valid number")
      .max(6)
      .or(z.literal(""))
      .default(""),
    allAbs: numericText("All Absolute Price Change"),
    generated: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.parts.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one part",
        path: ["parts"],
      })
    }
    v.parts.forEach((p) => {
      if (!v.partPlants[p]) {
        ctx.addIssue({
          code: "custom",
          message: `Select a plant for part ${p}`,
          path: ["partPlants"],
        })
      }
    })
    if (v.generated && v.partDetails.length !== v.parts.length) {
      ctx.addIssue({
        code: "custom",
        message: "Regenerate part details after changing the selection",
        path: ["partDetails"],
      })
    }
  })

export const wizardSchema = z.object({
  ...coreSchema.shape,
  ...claimSchema.shape,
  ...documentsSchema.shape,
  ...co2Schema.shape,
  ...lumpSumSchema.shape,
  ...partsSchema.shape,
})

export type WizardValues = z.infer<typeof wizardSchema>
export type CoreValues = z.infer<typeof coreSchema>
export type ClaimValues = z.infer<typeof claimSchema>
export type DocumentsValues = z.infer<typeof documentsSchema>
export type Co2Values = z.infer<typeof co2Schema>
export type LumpSumValues = z.infer<typeof lumpSumSchema>
export type PartsValues = z.infer<typeof partsSchema>
export type PartDetailValues = z.infer<typeof partDetailSchema>

export const stepSchemas = {
  core: coreSchema,
  claim: claimSchema,
  documents: documentsSchema,
  co2: co2Schema,
  lumpsum: lumpSumSchema,
  parts: partsSchema,
} as const

export const mandateSchema = z.object({
  problem: z
    .string()
    .min(1, "Problem Statement is required")
    .max(2000, "Problem Statement must be 2000 characters or less"),
  details: z
    .string()
    .min(1, "Details of Request is required")
    .max(2000, "Details of Request must be 2000 characters or less"),
  fbp: z.string().default("FBP Officer"),
  reds: bounded("REDS Score", 255),
  proposedChanges: z.enum(["Yes", "No"], {
    message: "Select whether GT&C changes are proposed",
  }),
  mainRisk: z.string().default(""),
  category: required("Category"),
  audit: required("Audit"),
  stakeholders: bounded("Other stakeholders", 255),
  ariba: bounded("Ariba Reference", 255),
})

export type MandateValues = z.infer<typeof mandateSchema>

export const noteSchema = z.object({
  note: z
    .string()
    .min(1, "Note cannot be empty")
    .max(1000, "Note must be 1000 characters or less"),
})

export type NoteValues = z.infer<typeof noteSchema>
