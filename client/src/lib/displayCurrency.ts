import { isOnboardingResidenceCountry } from './onboardingResidenceCountries'

export type DisplayCurrencyCode = 'USD' | 'GBP' | 'EUR'

const RESIDENCE_US = 'United States'
const RESIDENCE_UK = 'United Kingdom'

let activeDisplayCurrency: DisplayCurrencyCode = 'USD'

/** Map welcome/settings residence to app display currency. */
export function residenceCountryToDisplayCurrency(country: string): DisplayCurrencyCode {
  const trimmed = country.trim()
  if (!trimmed) return 'USD'
  if (trimmed === RESIDENCE_US) return 'USD'
  if (trimmed === RESIDENCE_UK) return 'GBP'
  if (trimmed === 'Other Europe' || trimmed === 'Other') return trimmed === 'Other' ? 'USD' : 'EUR'
  if (isOnboardingResidenceCountry(trimmed)) return 'EUR'
  return 'USD'
}

export function setDisplayCurrencyCode(code: DisplayCurrencyCode): void {
  activeDisplayCurrency = code
}

export function syncDisplayCurrencyFromResidence(country: string): void {
  setDisplayCurrencyCode(residenceCountryToDisplayCurrency(country))
}

export function getDisplayCurrencyCode(): DisplayCurrencyCode {
  return activeDisplayCurrency
}

function localeForCurrency(code: DisplayCurrencyCode): string {
  switch (code) {
    case 'GBP':
      return 'en-GB'
    case 'EUR':
      return 'en-IE'
    default:
      return 'en-US'
  }
}

export function currencySymbol(code: DisplayCurrencyCode = getDisplayCurrencyCode()): string {
  switch (code) {
    case 'GBP':
      return '£'
    case 'EUR':
      return '€'
    default:
      return '$'
  }
}

export function formatMoney(n: number, code: DisplayCurrencyCode = getDisplayCurrencyCode()): string {
  if (!Number.isFinite(n)) return formatMoney(0, code)
  return new Intl.NumberFormat(localeForCurrency(code), {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(n))
}

export function formatMoneyDigits(n: number, code: DisplayCurrencyCode = getDisplayCurrencyCode()): string {
  if (!Number.isFinite(n) || n === 0) return '0'
  return Math.round(n).toLocaleString(localeForCurrency(code))
}

export function formatMoneyK(n: number, code: DisplayCurrencyCode = getDisplayCurrencyCode()): string {
  if (!Number.isFinite(n)) return formatMoney(0, code)
  const sym = currencySymbol(code)
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`
  return `${sym}${Math.round(n / 1000)}k`
}

export function formatSignedMonthly(surplus: number, code: DisplayCurrencyCode = getDisplayCurrencyCode()): string {
  const n = Math.round(surplus)
  const amount = formatMoney(Math.abs(n), code)
  if (n > 0) return `+${amount}/mo`
  if (n < 0) return `- ${amount}/mo`
  return `${amount}/mo`
}
