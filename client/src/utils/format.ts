export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '$0'
  return '$' + Math.round(n).toLocaleString('en-US')
}

export function fmtK(n: number): string {
  if (!Number.isFinite(n)) return '$0'
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  return '$' + Math.round(n / 1000) + 'k'
}

export function fmtMon(n: number): string {
  return fmt(n) + '/mo'
}

/** Monthly surplus/shortfall: `+$1,234/mo` or `- $1,234/mo`. */
export function fmtSignedMonthly(surplus: number): string {
  const n = Math.round(surplus)
  const amount = '$' + Math.abs(n).toLocaleString('en-US')
  if (n > 0) return `+${amount}/mo`
  if (n < 0) return `- ${amount}/mo`
  return `${amount}/mo`
}

export function fmtInput(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '0'
  return Math.round(n).toLocaleString('en-US')
}

export function parseNum(raw: string): number {
  const v = parseFloat((raw || '').replace(/,/g, ''))
  return Number.isFinite(v) && v >= 0 ? v : 0
}
