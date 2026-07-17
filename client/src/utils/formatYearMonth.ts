const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/**
 * Format a `YYYY-MM` stamp as `Month YYYY` (e.g. `2026-05` → `May 2026`).
 * Returns the trimmed input unchanged when the shape is not `YYYY-MM`.
 */
export function formatYearMonthLabel(yearMonth: string): string {
  const trimmed = yearMonth.trim()
  const match = /^(\d{4})-(\d{2})$/.exec(trimmed)
  if (!match) return trimmed
  const monthIndex = Number(match[2]) - 1
  if (monthIndex < 0 || monthIndex > 11) return trimmed
  return `${MONTH_NAMES[monthIndex]} ${match[1]}`
}
