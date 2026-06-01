export type FilingStatusId =
  | 'single'
  | 'marriedFilingJointly'
  | 'marriedFilingSeparately'
  | 'headOfHousehold'

export const DEFAULT_FILING_STATUS: FilingStatusId
export const STD_DEDUCTIONS_2024: Record<FilingStatusId, number>
export const FILING_STATUS_LABELS: Record<FilingStatusId, string>

export function normalizeFilingStatus(raw: unknown): FilingStatusId
export function standardDeductionForFilingStatus(status: FilingStatusId): number
export function ordinaryIncomeTax(taxableIncome: number, status: FilingStatusId): number
export function ssTaxableFromProvisional(
  ssAnn: number,
  provisional: number,
  status: FilingStatusId,
): number
export function ltcgTaxRate(
  ordinaryIncome: number,
  brkGain: number,
  status: FilingStatusId,
): number
export function rothConversionRoom(tradWdAnn: number, status: FilingStatusId): number
export function ssProvisionalThresholds(status: FilingStatusId): {
  half50: number
  full85: number
  always85: boolean
}
export function filingStatusLabel(status: FilingStatusId): string
