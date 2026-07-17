/** International tax planning constants — simplified US expat model. */

import healthInsuranceByIso from './healthInsuranceByIso.json'
import { COUNTRY_RETIREMENT_TAX_DETAIL } from './countryRetirementTaxDetail'
import type { RetirementTaxDetail } from './retirementTaxDetail'
import { usdToEur, getUsdToEurRate } from '../lib/api/exchangeRates'
import { calcPortugalTax, PT_REFERENCE_TAXABLE_EUR } from '../lib/calc/portugalTax'
import {
  franceBlendedEffectiveRate,
  FR_NON_SS_STUB_RATE,
} from '../lib/calc/franceTax'
import {
  calcNetherlandsTax,
  isAtNetherlandsAowAge,
  NL_REFERENCE_TAXABLE_EUR,
} from '../lib/calc/netherlandsTax'
import { IT_UNSOURCED_EFFECTIVE_STUB, resolveItalyEffectiveTaxRate } from '../lib/calc/italyTax'

const HEALTH_INS_BY_ISO = healthInsuranceByIso as Record<string, number>

/** Reference effective rate at €50k taxable — display fallback only; live paths use calcPortugalTax. */
const PT_REFERENCE_EFFECTIVE_RATE = calcPortugalTax(PT_REFERENCE_TAXABLE_EUR).effectiveRate
/** Below-AOW display fallback; live paths use the user's modeled age. */
const NL_REFERENCE_EFFECTIVE_RATE = calcNetherlandsTax(
  NL_REFERENCE_TAXABLE_EUR,
  false,
).effectiveRate

export type CountryTaxEntry = {
  code: string
  name: string
  flagEmoji: string
  currencyCode: string
  /**
   * Effective rate on gross retirement income for planning (decimal).
   * Portugal / Netherlands: reference rate at €50k taxable — prefer
   * {@link resolveCountryEffectiveRetirementRate}.
   */
  effectiveRetirementRate: number
  rateDescription: string
  usExpatNotes: string
  visaNotes: string
  healthcareNotes: string
  teleportSlug: string
  defaultMonthlyCostUsd: number
  /** Monthly private health insurance estimate (USD) from combined destination data. */
  healthInsuranceEstimateUsd: number
  lastVerified: string
  sourceUrl: string
  retirementTaxDetail: RetirementTaxDetail
}

export const COUNTRY_TAX_RATES: Record<string, CountryTaxEntry> = {
  PT: c(
    'PT',
    'Portugal',
    '🇵🇹',
    'EUR',
    PT_REFERENCE_EFFECTIVE_RATE,
    'Progressive IRS rates up to 48% (Art. 68 CIRS 2026). NHR closed to new applicants in 2024 — use the income-based Portugal tax calculator, not a flat rate.',
    'porto-pt',
    2600,
  ),
  ES: c('ES', 'Spain', '🇪🇸', 'EUR', 0.19, 'Beckham Law and regional variations — placeholder flat rate.', 'valencia-es', 2700),
  IT: c(
    'IT',
    'Italy',
    '🇮🇹',
    'EUR',
    IT_UNSOURCED_EFFECTIVE_STUB,
    'Standard progressive IRPEF for most catalog cities (Art. 24-ter 7% only for confirmed eligible towns ≤30k). IRPEF brackets not sourced yet; non-eligible rate is a temporary planning stub.',
    'rome-it',
    2800,
  ),
  MX: c('MX', 'Mexico', '🇲🇽', 'MXN', 0.1, 'Residency triggers local filing; US citizens still owe US tax on worldwide income.', 'merida-mx', 2200),
  CR: c(
    'CR',
    'Costa Rica',
    '🇨🇷',
    'CRC',
    0,
    'Territorial: foreign-source pensions, Social Security, dividends, and capital gains are not taxed locally (0%). Local-source Costa Rican income is taxed progressively — not the case Expectifi models for US retirees.',
    'san-jose-cr',
    2400,
  ),
  PA: c('PA', 'Panama', '🇵🇦', 'USD', 0, 'Territorial tax system — foreign-sourced income often not taxed locally.', 'panama-city-pa', 2300),
  TH: c('TH', 'Thailand', '🇹🇭', 'THB', 0.15, 'Remittance-based elements — educational placeholder rate.', 'chiang-mai-th', 1800),
  GR: c('GR', 'Greece', '🇬🇷', 'EUR', 0.07, 'Flat tax incentive for pensioners relocating to Greece (qualifying).', 'athens-gr', 2400),
  FR: c(
    'FR',
    'France',
    '🇫🇷',
    'EUR',
    FR_NON_SS_STUB_RATE,
    'SS taxed under 2026 progressive brackets (Art. 20). Pension/investment income: 0–45% by amount and type; US government pensions may be reserved to US taxation (Art. 19). CSM and prélèvements sociaux can apply on top. Non-SS surplus math uses a ~25% stub until pension type is modeled.',
    'lyon-fr',
    3200,
  ),
  DE: c('DE', 'Germany', '🇩🇪', 'EUR', 0.15, 'Tax treaties and pension treatment vary — placeholder rate.', 'berlin-de', 3400),
  NL: c(
    'NL',
    'Netherlands',
    '🇳🇱',
    'EUR',
    NL_REFERENCE_EFFECTIVE_RATE,
    '2026 Box 1 progressive pension tax, with a reduced first bracket at AOW age (modeled from age 67). Estimate excludes Dutch tax credits and can materially overstate final tax.',
    'amsterdam-nl',
    3800,
  ),
  IE: c('IE', 'Ireland', '🇮🇪', 'EUR', 0.12, 'US-Ireland treaty may affect pensions — simplified rate.', 'dublin-ie', 3600),
  GB: c('GB', 'United Kingdom', '🇬🇧', 'GBP', 0.2, 'State pension and private pensions taxed under UK rules.', 'edinburgh-gb', 3500),
  CA: c('CA', 'Canada', '🇨🇦', 'CAD', 0.15, 'Provincial taxes apply — federal+provincial simplified.', 'halifax-ca', 3200),
  AU: c('AU', 'Australia', '🇦🇺', 'AUD', 0.15, 'Superannuation and age pension rules differ from US 401k.', 'adelaide-au', 3400),
  NZ: c('NZ', 'New Zealand', '🇳🇿', 'NZD', 0.15, 'NZ superannuation and foreign pensions may be taxable.', 'wellington-nz', 3200),
  JP: c('JP', 'Japan', '🇯🇵', 'JPY', 0.1, 'Residency status drives worldwide vs Japan-source taxation.', 'fukuoka-jp', 3000),
  CO: c('CO', 'Colombia', '🇨🇴', 'COP', 0.1, 'Pensionado visa popular — local tax on Colombian-source income.', 'medellin-co', 2000),
  EC: c('EC', 'Ecuador', '🇪🇨', 'USD', 0.0, 'USD economy; simplified low local rate on foreign pensions.', 'cuenca-ec', 1600),
  VN: c('VN', 'Vietnam', '🇻🇳', 'VND', 0.1, 'Tax residency after 183 days — placeholder rate.', 'da-nang-vn', 1500),
  PH: c('PH', 'Philippines', '🇵🇭', 'PHP', 0.1, 'SSS/PhilHealth separate from US Medicare planning.', 'cebu-ph', 1400),
  MY: c('MY', 'Malaysia', '🇲🇾', 'MYR', 0.1, 'MM2H program changed — verify current visa rules.', 'penang-my', 1800),
  UY: c('UY', 'Uruguay', '🇺🇾', 'UYU', 0.12, 'Tax holiday for new residents on foreign income (limited years).', 'montevideo-uy', 2500),
  CL: c('CL', 'Chile', '🇨🇱', 'CLP', 0.12, 'Pensionado visa — local tax on Chilean-source income.', 'valparaiso-cl', 2400),
}

function c(
  code: string,
  name: string,
  flagEmoji: string,
  currencyCode: string,
  effectiveRetirementRate: number,
  rateDescription: string,
  teleportSlug: string,
  defaultMonthlyCostUsd: number,
): CountryTaxEntry {
  const detail = COUNTRY_RETIREMENT_TAX_DETAIL[code]
  if (!detail) {
    throw new Error(`Missing retirement tax detail for country ${code}`)
  }
  return {
    code,
    name,
    flagEmoji,
    currencyCode,
    effectiveRetirementRate,
    rateDescription,
    usExpatNotes:
      'US citizens remain subject to US tax on worldwide income. Foreign Tax Credit and treaty provisions may reduce double taxation — not tax advice.',
    visaNotes:
      'Residency visas vary by income proof, health insurance, and local bank deposits. Confirm current requirements with official immigration sources.',
    healthcareNotes:
      'International private insurance typical until eligible for local systems. Medicare generally does not cover care abroad except limited emergencies.',
    teleportSlug,
    defaultMonthlyCostUsd,
    healthInsuranceEstimateUsd: HEALTH_INS_BY_ISO[code] ?? 175,
    lastVerified: detail.lastVerified,
    sourceUrl: detail.sourceUrl,
    retirementTaxDetail: detail,
  }
}

export function getCountryTaxEntry(code: string): CountryTaxEntry | undefined {
  return COUNTRY_TAX_RATES[code.toUpperCase()]
}

/**
 * Income-aware effective local rate. Portugal and Netherlands use 2026 progressive
 * brackets; France blends Art. 20 SS tax with a non-SS stub. Italy uses an unsourced
 * IRPEF stub (Art. 24-ter 7% only for confirmed eligible towns).
 */
export function resolveCountryEffectiveRetirementRate(
  code: string,
  annualGrossUsd?: number,
  annualSsUsd?: number,
  modeledAge?: number,
  city?: string | null,
): number {
  const iso = code.toUpperCase()
  if (iso === 'PT') {
    const taxableEur =
      annualGrossUsd != null && annualGrossUsd > 0
        ? usdToEur(annualGrossUsd)
        : PT_REFERENCE_TAXABLE_EUR
    // Same path as getEffectiveTaxRate — Cat. H pension deduction then brackets.
    return calcPortugalTax(taxableEur).effectiveRate
  }
  if (iso === 'FR') {
    const gross =
      annualGrossUsd != null && annualGrossUsd > 0 ? annualGrossUsd : undefined
    if (gross == null) return FR_NON_SS_STUB_RATE
    const eurPerUsd = getUsdToEurRate()
    return franceBlendedEffectiveRate(
      gross,
      annualSsUsd,
      usdToEur,
      (eur) => (eurPerUsd > 0 ? eur / eurPerUsd : 0),
    )
  }
  if (iso === 'NL') {
    const taxableEur =
      annualGrossUsd != null && annualGrossUsd > 0
        ? usdToEur(annualGrossUsd)
        : NL_REFERENCE_TAXABLE_EUR
    return calcNetherlandsTax(
      taxableEur,
      isAtNetherlandsAowAge(modeledAge),
    ).effectiveRate
  }
  if (iso === 'IT') {
    return resolveItalyEffectiveTaxRate(city)
  }
  return getCountryTaxEntry(code)?.effectiveRetirementRate ?? 0
}
