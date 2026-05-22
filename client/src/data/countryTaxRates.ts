/** International tax planning constants — simplified US expat model. */

import healthInsuranceByIso from './healthInsuranceByIso.json'
import { COUNTRY_RETIREMENT_TAX_DETAIL } from './countryRetirementTaxDetail'
import type { RetirementTaxDetail } from './retirementTaxDetail'

const HEALTH_INS_BY_ISO = healthInsuranceByIso as Record<string, number>

export type CountryTaxEntry = {
  code: string
  name: string
  flagEmoji: string
  currencyCode: string
  /** Effective rate on gross retirement income for planning (decimal). */
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
  PT: c('PT', 'Portugal', '🇵🇹', 'EUR', 0.2, 'Non-habitual resident regime may reduce foreign pension tax for a limited period.', 'porto-pt', 2600),
  ES: c('ES', 'Spain', '🇪🇸', 'EUR', 0.19, 'Beckham Law and regional variations — placeholder flat rate.', 'valencia-es', 2700),
  IT: c('IT', 'Italy', '🇮🇹', 'EUR', 0.07, '7% flat tax option for qualifying new residents on foreign-sourced income.', 'rome-it', 2800),
  MX: c('MX', 'Mexico', '🇲🇽', 'MXN', 0.1, 'Residency triggers local filing; US citizens still owe US tax on worldwide income.', 'merida-mx', 2200),
  CR: c('CR', 'Costa Rica', '🇨🇷', 'CRC', 0.1, 'Territorial elements — model uses simplified effective rate.', 'san-jose-cr', 2400),
  PA: c('PA', 'Panama', '🇵🇦', 'USD', 0, 'Territorial tax system — foreign-sourced income often not taxed locally.', 'panama-city-pa', 2300),
  TH: c('TH', 'Thailand', '🇹🇭', 'THB', 0.15, 'Remittance-based elements — educational placeholder rate.', 'chiang-mai-th', 1800),
  GR: c('GR', 'Greece', '🇬🇷', 'EUR', 0.07, 'Flat tax incentive for pensioners relocating to Greece (qualifying).', 'athens-gr', 2400),
  FR: c('FR', 'France', '🇫🇷', 'EUR', 0.1, 'Progressive system — simplified effective rate on retirement income.', 'lyon-fr', 3200),
  DE: c('DE', 'Germany', '🇩🇪', 'EUR', 0.15, 'Tax treaties and pension treatment vary — placeholder rate.', 'berlin-de', 3400),
  NL: c('NL', 'Netherlands', '🇳🇱', 'EUR', 0.18, '30% ruling not typically for retirees — ordinary rates modeled.', 'amsterdam-nl', 3800),
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
