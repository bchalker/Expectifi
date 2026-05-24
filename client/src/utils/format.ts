import {
  formatMoney,
  formatMoneyDigits,
  formatMoneyK,
  formatSignedMonthly,
} from '../lib/displayCurrency'

export function fmt(n: number): string {
  return formatMoney(n)
}

export function fmtK(n: number): string {
  return formatMoneyK(n)
}

export function fmtMon(n: number): string {
  return fmt(n) + '/mo'
}

/** Monthly surplus/shortfall: `+$1,234/mo` or `- $1,234/mo`. */
export function fmtSignedMonthly(surplus: number): string {
  return formatSignedMonthly(surplus)
}

export function fmtInput(n: number): string {
  return formatMoneyDigits(n)
}

export function parseNum(raw: string): number {
  const v = parseFloat((raw || '').replace(/,/g, ''))
  return Number.isFinite(v) && v >= 0 ? v : 0
}
