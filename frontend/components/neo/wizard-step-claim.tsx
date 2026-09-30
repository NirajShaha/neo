"use client"

import { useFormContext, useWatch } from "react-hook-form"
import {
  ControlledAreaField,
  ControlledCountInput,
  ControlledDateField,
  ControlledRadioCards,
  ControlledRadioInline,
  ControlledSelectField,
  ControlledTextField,
  ControlledCheckRow,
  FieldLabel,
  StaticField,
} from "@/components/neo/wizard-fields"
import {
  budgetFxRate,
  claimCurrency,
  commodityAreas,
  fiscalYears,
  levers,
  nonStandardFlags,
  notificationMethods,
  systems,
  toGbp,
  transactionDrivers,
  vendorOptions,
} from "@/lib/neo-wizard"
import { likelihoods, maturityStatuses } from "@/lib/neo-wizard"
import type { WizardValues } from "@/lib/neo-schemas"

export function ClaimDetailsStep() {
  const { control } = useFormContext<WizardValues>()
  const vendor = useWatch({ control, name: "vendor" }) ?? ""
  const dt2Vendor = useWatch({ control, name: "dt2Vendor" }) ?? ""
  const showAllVendors = useWatch({ control, name: "showAllVendors" }) ?? false
  const showAllDt2 = useWatch({ control, name: "showAllDt2" }) ?? false
  const transactionType = useWatch({ control, name: "transactionType" }) ?? ""
  const annualForecastLocal =
    useWatch({ control, name: "annualForecastLocal" }) ?? ""
  const vendorName = vendor || "-"
  const dt2Name = dt2Vendor || "-"
  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-4">
      <div className="col-span-2 grid grid-cols-2 gap-x-10">
        <div>
          <FieldLabel required>Supplier Claim Type</FieldLabel>
          <ControlledRadioCards<WizardValues, "Risk" | "Opportunity">
            name="claimType"
            control={control}
            options={["Risk", "Opportunity"]}
          />
        </div>
        <div>
          <FieldLabel>Confidential?</FieldLabel>
          <ControlledRadioInline<WizardValues>
            name="confidential"
            control={control}
            options={["Yes", "No"]}
          />
        </div>
      </div>

      <ControlledSelectField<WizardValues>
        label="Fiscal Year"
        required
        name="fiscalYear"
        control={control}
        options={fiscalYears}
        allowAny={false}
      />
      <div>
        <FieldLabel required>Method of Notification</FieldLabel>
        <ControlledRadioInline<WizardValues>
          name="notification"
          control={control}
          options={notificationMethods}
        />
      </div>

      <ControlledSelectField<WizardValues>
        label="Vendor"
        required
        hint="Select the primary vendor for this claim"
        name="vendor"
        control={control}
        options={vendorOptions(showAllVendors)}
        placeholder="-- Please Select Vendor --"
      />
      <div className="grid grid-cols-2 gap-x-10">
        <ControlledCheckRow<WizardValues>
          name="showAllVendors"
          control={control}
          label="Show all Vendor(s)"
        />
        <StaticField label="Vendor Name" value={vendorName} />
      </div>

      <ControlledSelectField<WizardValues>
        label="DT2 Vendor"
        hint="Direct-to-tier-2 vendor, if applicable"
        name="dt2Vendor"
        control={control}
        options={vendorOptions(showAllDt2)}
        placeholder="-- Please Select DT2 Vendor --"
      />
      <div className="grid grid-cols-2 gap-x-10">
        <ControlledCheckRow<WizardValues>
          name="showAllDt2"
          control={control}
          label="Show all DT2 Vendor(s)"
        />
        <StaticField label="DT2 Vendor Name" value={dt2Name} />
      </div>

      <div className="col-span-2 grid grid-cols-4 gap-x-10">
        <div>
          <FieldLabel required>Transaction Type</FieldLabel>
          <ControlledRadioInline<WizardValues>
            name="transactionType"
            control={control}
            options={["Lump Sum", "POA"]}
          />
        </div>
        {transactionType === "Lump Sum" && (
          <>
            <ControlledDateField<WizardValues>
              label="Transaction Start Date"
              required
              name="transactionStart"
              control={control}
            />
            <ControlledDateField<WizardValues>
              label="Transaction End Date"
              required
              name="transactionEnd"
              control={control}
            />
            <div>
              <FieldLabel hint="NON_STANDARD_ACCOUNTING_ID ref">
                Non-Standard Transaction Flag
              </FieldLabel>
              <ControlledRadioInline<WizardValues>
                name="nonStandardFlag"
                control={control}
                options={["Prepayment", "Loans", "Deposits"]}
              />
            </div>
          </>
        )}
      </div>

      <div className="col-span-2">
        <FieldLabel hint="TRANSACTION_TYPE_BREAKDOWN_ID ref">
          Transaction Drivers
        </FieldLabel>
        <ControlledRadioInline<WizardValues>
          name="transactionDrivers"
          control={control}
          options={transactionDrivers}
        />
      </div>

      <div className="col-span-2">
        <ControlledSelectField<WizardValues>
          label="Lever"
          required
          name="lever"
          control={control}
          options={levers}
          placeholder="-- Please Select Lever --"
        />
      </div>

      <ControlledCountInput<WizardValues>
        id="mya"
        label="MYA Reference"
        name="myaRef"
        control={control}
        max={255}
        placeholder="MYA Reference"
      />
      <ControlledCountInput<WizardValues>
        id="scpa"
        label="SCPA Reference"
        name="scpaRef"
        control={control}
        max={255}
        placeholder="SCPA Reference"
      />

      <ControlledDateField<WizardValues>
        label="Goods Receipt Date"
        name="goodsReceipt"
        control={control}
      />
      <ControlledDateField<WizardValues>
        label="Implementation Date"
        required
        name="implementation"
        control={control}
      />

      <ControlledAreaField<WizardValues>
        id="desc"
        label="Description"
        required
        hint="Describe the risk or opportunity in detail"
        name="description"
        control={control}
        placeholder="Description"
        max={2000}
      />
      <ControlledSelectField<WizardValues>
        label="System"
        required
        name="system"
        control={control}
        options={systems}
        placeholder="-- Please Select System --"
      />

      <ControlledTextField<WizardValues>
        id="strat"
        label="Associated Strategic Buyer"
        name="strategicBuyer"
        control={control}
        placeholder="-- Please Select Associated Strategic Buyer --"
      />
      <ControlledSelectField<WizardValues>
        label="Global Commodity Lead Area"
        name="commodityArea"
        control={control}
        options={commodityAreas}
        placeholder="-- Please Select Global Commodity Lead Area --"
      />

      <ControlledSelectField<WizardValues>
        label="Maturity Status"
        required
        name="maturity"
        control={control}
        options={maturityStatuses}
        placeholder="-- Please Select Maturity Status --"
      />
      <div />
      <ControlledSelectField<WizardValues>
        label="Likelihood"
        required
        name="likelihood"
        control={control}
        options={likelihoods}
        placeholder="-- Please Select Likelihood --"
      />
      <div />

      <StaticField label="Currency" value={claimCurrency} />
      <StaticField label="Budget Exchange Rate" value={budgetFxRate} />

      <ControlledTextField<WizardValues>
        id="afl"
        label="Annual Forecast Local (+)"
        required
        hint="Forecast value in local currency"
        name="annualForecastLocal"
        control={control}
        placeholder="Annual Forecast Local (+)"
        inputMode="decimal"
      />
      <StaticField
        label="Annual Forecast (£)"
        value={toGbp(annualForecastLocal)}
      />

      <ControlledTextField<WizardValues>
        id="gcl"
        label="Gross Claim Local (+)"
        required
        hint="Gross claim value in local currency"
        name="grossClaimLocal"
        control={control}
        placeholder="Gross Claim Local (+)"
        inputMode="decimal"
      />
      <div />

      <StaticField
        label="Calendarised Forecast Local"
        value={
          annualForecastLocal
            ? `${Number(annualForecastLocal.replace(/,/g, "") || 0).toLocaleString("en-GB", { minimumFractionDigits: 4 })}`
            : "-"
        }
      />
      <StaticField
        label="Calendarised Forecast (£)"
        value={toGbp(annualForecastLocal)}
      />
    </div>
  )
}
