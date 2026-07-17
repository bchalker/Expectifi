import { DataConfidenceNote } from './DataConfidenceNote'
import { formatYearMonthLabel } from '../../utils/formatYearMonth'

type Props = {
  /** Dataset `metadata.last_updated` as `YYYY-MM`. */
  lastUpdated: string
  className?: string
}

export function dataLastUpdatedMessage(lastUpdated: string): string {
  return `Data last updated ${formatYearMonthLabel(lastUpdated)}.`
}

/** Shared freshness stamp for datasets that expose `metadata.last_updated` (YYYY-MM). */
export function DataFreshnessNote({ lastUpdated, className }: Props) {
  const trimmed = lastUpdated.trim()
  if (!trimmed) return null
  return (
    <DataConfidenceNote
      variant="message"
      text={dataLastUpdatedMessage(trimmed)}
      className={className}
    />
  )
}
