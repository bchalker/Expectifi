import { getCountryTaxEntry } from '../data/countryTaxRates'
import { countryToIsoCode } from './costOfLiving'
import { getTaxVisaData } from './taxVisa'
import { usdToEur } from '../lib/api/exchangeRates'
import { calcPortugalTax, PT_REFERENCE_TAXABLE_EUR } from '../lib/calc/portugalTax'
import {
  IT_ART_24_TER_RATE,
  IT_UNSOURCED_EFFECTIVE_STUB,
  isItalyArt24TerEligibleCity,
} from '../lib/calc/italyTax'

/** Flat / territorial regimes especially favorable for US retirees (see retirement-tax-visa.json). */
const TAX_FAVORABLE_US_RETIREE_COUNTRIES = new Set([
  'Panama',
  'Paraguay',
  'Georgia',
])

export type RetirementTaxScoreComponents = {
  topIncomeTaxRatePct: number | null
  taxScore: number
  estimatedTaxRate: number
}

/** Parse top marginal rate from Tax & Visa tab `tax_rate_label` copy. */
export function parseTopIncomeTaxRatePercent(label: string): number | null {
  const s = label.trim().toLowerCase()
  if (!s) return null

  if (
    s.includes('territorial') ||
    s.includes('not taxed') ||
    s.includes('no personal income tax') ||
    s.includes('no income tax') ||
    s.includes('zero income tax') ||
    s.startsWith('0% on foreign')
  ) {
    return 0
  }

  if (s.includes('exempt locally') || s.includes('exempt from local')) {
    return 15
  }

  const upTo = s.match(/up to (\d+(?:\.\d+)?)\s*%/)
  if (upTo) return parseFloat(upTo[1])

  const range = s.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*%/)
  if (range) {
    return Math.max(parseFloat(range[1]), parseFloat(range[2]))
  }

  const flat = s.match(/(\d+(?:\.\d+)?)\s*%\s*flat/)
  if (flat) return parseFloat(flat[1])

  const firstPct = s.match(/(\d+(?:\.\d+)?)\s*%/)
  if (firstPct) return parseFloat(firstPct[1])

  return null
}

export function taxScoreFromTopRate(topRatePct: number): number {
  if (topRatePct > 40) return 30
  if (topRatePct >= 30) return 55
  if (topRatePct >= 20) return 75
  return 100
}

export function estimatedTaxRateFromTopRate(topRatePct: number): number {
  if (topRatePct > 40) return 0.35
  if (topRatePct >= 30) return 0.28
  if (topRatePct >= 20) return 0.2
  return 0.12
}

const NEUTRAL_TAX_SCORE = 60
const NEUTRAL_ESTIMATED_TAX_RATE = 0.2

function portugalTaxScoreComponents(monthlyIncomeUsd?: number): RetirementTaxScoreComponents {
  const annualUsd =
    monthlyIncomeUsd != null && monthlyIncomeUsd > 0 ? monthlyIncomeUsd * 12 : undefined
  const taxableEur = annualUsd != null ? usdToEur(annualUsd) : PT_REFERENCE_TAXABLE_EUR
  const result = calcPortugalTax(taxableEur)
  const effectivePct = result.effectiveRate * 100
  return {
    topIncomeTaxRatePct: 48,
    // Score from real effective rate at this income — not a static "favorable" bucket.
    taxScore: taxScoreFromTopRate(effectivePct),
    estimatedTaxRate: result.effectiveRate,
  }
}

function italyTaxScoreComponents(city?: string | null): RetirementTaxScoreComponents {
  if (isItalyArt24TerEligibleCity(city)) {
    return {
      topIncomeTaxRatePct: 7,
      taxScore: 100,
      estimatedTaxRate: IT_ART_24_TER_RATE,
    }
  }
  return {
    topIncomeTaxRatePct: null,
    // Stub until IRPEF brackets are sourced — not Art. 24-ter 7%.
    taxScore: taxScoreFromTopRate(IT_UNSOURCED_EFFECTIVE_STUB * 100),
    estimatedTaxRate: IT_UNSOURCED_EFFECTIVE_STUB,
  }
}

export function resolveRetirementTaxScoreComponents(
  country?: string | null,
  monthlyIncomeUsd?: number,
  city?: string | null,
): RetirementTaxScoreComponents {
  const trimmed = country?.trim() ?? ''

  if (trimmed === 'Portugal') {
    return portugalTaxScoreComponents(monthlyIncomeUsd)
  }

  if (trimmed === 'Italy') {
    return italyTaxScoreComponents(city)
  }

  if (trimmed && TAX_FAVORABLE_US_RETIREE_COUNTRIES.has(trimmed)) {
    return {
      topIncomeTaxRatePct: null,
      taxScore: 100,
      estimatedTaxRate: 0.07,
    }
  }

  const taxVisa = trimmed ? getTaxVisaData(trimmed) : null
  let topRate = taxVisa ? parseTopIncomeTaxRatePercent(taxVisa.tax_rate_label) : null

  if (topRate == null && trimmed) {
    const iso = countryToIsoCode(trimmed)
    const entry = iso ? getCountryTaxEntry(iso) : undefined
    if (entry?.retirementTaxDetail.territorialSystem) {
      topRate = 0
    } else if (entry && entry.effectiveRetirementRate >= 0) {
      topRate = Math.round(entry.effectiveRetirementRate * 100)
    }
  }

  if (topRate == null) {
    return {
      topIncomeTaxRatePct: null,
      taxScore: NEUTRAL_TAX_SCORE,
      estimatedTaxRate: NEUTRAL_ESTIMATED_TAX_RATE,
    }
  }

  return {
    topIncomeTaxRatePct: topRate,
    taxScore: taxScoreFromTopRate(topRate),
    estimatedTaxRate: estimatedTaxRateFromTopRate(topRate),
  }
}
