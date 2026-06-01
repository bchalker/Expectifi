import {
  DEFAULT_FILING_STATUS,
  FILING_STATUS_LABELS,
  normalizeFilingStatus,
  type FilingStatusId,
} from 'shared'

export type { FilingStatusId } from 'shared'

export const DEFAULT_CALCULATOR_FILING_STATUS: FilingStatusId = DEFAULT_FILING_STATUS

export const FILING_STATUS_OPTIONS: { id: FilingStatusId; label: string }[] = (
  Object.keys(FILING_STATUS_LABELS) as FilingStatusId[]
).map((id) => ({ id, label: FILING_STATUS_LABELS[id] }))

export function normalizeCalculatorFilingStatus(raw: unknown): FilingStatusId {
  return normalizeFilingStatus(raw)
}

export function filingStatusDisplayLabel(status: FilingStatusId): string {
  return FILING_STATUS_LABELS[normalizeFilingStatus(status)]
}
