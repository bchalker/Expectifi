import type { RetirementCityRecord } from './retirementDestinations'
import {
  calculateMonthlyBudget,
  DEFAULT_LIFESTYLE,
  type CityData,
  type LifestyleInputs,
} from '../utils/costOfLiving'
import { usdToEur, getUsdToEurRate } from './api/exchangeRates'
import { calcPortugalTax, PT_REFERENCE_TAXABLE_EUR } from './calc/portugalTax'
import {
  franceBlendedEffectiveRate,
  FR_NON_SS_STUB_RATE,
} from './calc/franceTax'
import {
  calcNetherlandsTax,
  isAtNetherlandsAowAge,
  NL_REFERENCE_TAXABLE_EUR,
} from './calc/netherlandsTax'
import {
  isItalyArt24TerEligibleCity,
  resolveItalyEffectiveTaxRate,
} from './calc/italyTax'

/**
 * Effective local tax rate on gross retirement income for US expat planning.
 * Simplified model — represents approximate effective rate at $3,000–$8,000/mo gross
 * unless income is provided (Portugal / Netherlands: progressive; France: Art. 20 on SS;
 * Italy: Art. 24-ter 7% for confirmed eligible towns; else unsourced IRPEF stub).
 * US federal tax still applies on worldwide income regardless of local rate.
 * Foreign Tax Credit and tax treaties may reduce combined burden — not tax advice.
 *
 * Sources: retirement-tax-visa.json, IRS treaty tables, Tax Foundation,
 * Greenback Tax Services, Taxes for Expats. Last verified: 2026-05.
 */
export function getEffectiveTaxRate(
  countryIso: string,
  annualGrossUsd?: number,
  annualSsUsd?: number,
  modeledAge?: number,
  city?: string | null,
): number {
  const iso = countryIso.toUpperCase()
  if (iso === 'PT') {
    const taxableEur =
      annualGrossUsd != null && annualGrossUsd > 0
        ? usdToEur(annualGrossUsd)
        : PT_REFERENCE_TAXABLE_EUR
    // calcPortugalTax applies the Cat. H pension specific deduction before brackets.
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
    // Art. 24-ter 7% only for confirmed eligible towns; else IRPEF stub.
    return resolveItalyEffectiveTaxRate(city)
  }

  const RATES: Record<string, number> = {
    // === FLAT / SPECIAL REGIMES (most reliable) ===
    // IT: routed above — city-aware Art. 24-ter vs IRPEF stub
    GR: 0.07, // 7% flat — Article 5B, up to 15 years, US qualifies
    CY: 0.05, // 5% flat on foreign pensions over €3,420 (special regime)
    MT: 0.15, // 15% flat on foreign income (special regime)
    BG: 0.1, // 10% flat income tax
    RO: 0.1, // 10% flat income tax
    HU: 0.15, // 15% flat income tax
    RS: 0.15, // 15% flat income tax
    CZ: 0.15, // 15% flat (23% above threshold — effective ~15% at this income)
    MK: 0.1, // 10% flat income tax
    BA: 0.1, // 10% flat income tax
    ME: 0.09, // 9–15% flat — lowest in Europe
    XK: 0.05, // 0–10% progressive, simplified
    EE: 0.2, // 20% flat income tax
    AL: 0.15, // 15% flat income tax

    // === TERRITORIAL (foreign income generally not taxed locally) ===
    PA: 0.0, // territorial — foreign-sourced income not taxed
    CR: 0.0, // territorial — foreign-source pension/investment income not taxed (local-source income is progressive; not modeled)
    GE: 0.0, // territorial — foreign income not taxed
    AE: 0.0, // no income tax
    HK: 0.0, // territorial — foreign income not taxed
    SG: 0.0, // territorial — foreign income generally not taxed
    ID: 0.0, // territorial for non-residents

    // === WESTERN EUROPE (progressive, treaty countries) ===
    // PT / FR / NL: routed above
    ES: 0.19, // progressive up to 47% — ~19% effective
    DE: 0.22, // progressive — ~22% effective at this income
    BE: 0.3, // progressive up to 50% — ~30% effective
    IE: 0.2, // progressive — ~20% effective
    GB: 0.2, // progressive — ~20% effective
    AT: 0.25, // progressive 20–55% — ~25% effective
    CH: 0.2, // progressive, varies by canton — ~20% effective average
    LU: 0.28, // progressive up to 42% — ~28% effective at $5–6k/mo
    IS: 0.28, // progressive 22.5–46.3% — ~28% effective

    // === NORDICS (high progressive rates) ===
    DK: 0.37, // progressive up to 55.9% — ~37% effective
    SE: 0.3, // progressive — ~30% effective
    NO: 0.25, // progressive — ~25% effective
    FI: 0.3, // progressive up to 56.95% — ~30% effective

    // === EASTERN EUROPE (progressive, generally lower) ===
    PL: 0.15, // progressive 12–32% — ~15% effective
    HR: 0.2, // progressive 20–30%
    SK: 0.19, // progressive 19–25%
    SI: 0.2, // progressive 16–50% — ~20% effective
    LV: 0.23, // progressive 20–31%
    LT: 0.2, // progressive 15–32%

    // === LATIN AMERICA ===
    MX: 0.1, // progressive — ~10% effective on foreign pension
    CO: 0.1, // progressive — ~10% effective; no US-Colombia treaty
    EC: 0.05, // low/minimal local tax on foreign pensions
    UY: 0.05, // tax holiday for new residents (limited years)
    CL: 0.12, // progressive — US-Chile treaty applies
    AR: 0.2, // progressive up to 35% — simplified
    BR: 0.15, // progressive up to 27.5% — simplified

    // === ASIA-PACIFIC ===
    TH: 0.15, // remittance-based — ~15% simplified; US-Thailand treaty
    MY: 0.1, // foreign income often exempt until remitted — verify MM2H rules
    VN: 0.1, // taxable after 183 days residency; no US-Vietnam treaty
    PH: 0.1, // progressive — US-Philippines treaty applies
    JP: 0.15, // progressive national + local — ~15% effective; US-Japan treaty
    AU: 0.2, // progressive — US-Australia treaty applies
    NZ: 0.2, // progressive — US-New Zealand treaty applies
    KR: 0.15, // progressive 6–45% — ~15% effective at this income
    TW: 0.15, // progressive 5–40% — ~15% effective
    KH: 0.1, // simplified
    IN: 0.15, // progressive up to 30% — ~15% effective
    LK: 0.1, // progressive — simplified
    NP: 0.1, // progressive — simplified

    // === MIDDLE EAST / AFRICA ===
    OM: 0.0, // No personal income tax
    QA: 0.0, // Qatar, no income tax
    KW: 0.0, // Kuwait, no income tax
    BH: 0.0, // Bahrain, no income tax
    SA: 0.0, // Saudi Arabia, no income tax
    IL: 0.2, // progressive 10–50% — ~20% effective; US-Israel treaty
    JO: 0.1, // progressive 5–30% — simplified
    MA: 0.15, // progressive with pension exemptions available
    ZA: 0.18, // progressive up to 45% — ~18% effective at this income
    TR: 0.2, // progressive 15-40% — ~20% effective at this income
    CA: 0.18, // federal + provincial combined — ~18% effective; US-Canada treaty
  }

  return RATES[iso] ?? 0.2
}

export type RetirementFitResult = {
  taxRate: number
  taxAmount: number
  netIncome: number
  trueCOL: number
  healthAdj: number
  surplus: number
  visaQualifies: boolean
  lineItems: {
    rent: number
    utilities: number
    transport: number
    meals: number
    healthIns: number
  }
}

export function calcFit(
  budgetCity: CityData,
  catalog: RetirementCityRecord,
  grossMonthly: number,
  lifestyle: LifestyleInputs = DEFAULT_LIFESTYLE,
  monthlySsUsd?: number,
  modeledAge?: number,
): RetirementFitResult {
  const annualGrossUsd = Math.max(0, grossMonthly) * 12
  const annualSsUsd =
    monthlySsUsd != null && Number.isFinite(monthlySsUsd)
      ? Math.max(0, monthlySsUsd) * 12
      : undefined
  const taxRate = getEffectiveTaxRate(
    catalog.country_iso,
    annualGrossUsd,
    annualSsUsd,
    modeledAge,
    catalog.city,
  )
  const taxAmount = grossMonthly * taxRate
  const netIncome = grossMonthly - taxAmount

  const breakdown = calculateMonthlyBudget(budgetCity, lifestyle)
  const trueCOL = breakdown.total
  const healthAdj = breakdown.healthInsurance

  const surplus = netIncome - trueCOL
  const visaQualifies =
    catalog.visa.income_requirement_monthly_usd === 0 ||
    netIncome >= catalog.visa.income_requirement_monthly_usd

  return {
    taxRate,
    taxAmount,
    netIncome,
    trueCOL,
    healthAdj,
    surplus,
    visaQualifies,
    lineItems: {
      rent: breakdown.rent,
      utilities: breakdown.utilities + breakdown.mobile,
      transport: breakdown.transport,
      meals: breakdown.groceries + breakdown.dining + breakdown.alcohol,
      healthIns: healthAdj,
    },
  }
}

const ENG_SCORE_MAP: Record<string, number> = {
  native: 10,
  very_high: 9,
  high: 7,
  moderate_high: 5,
  moderate: 3,
  low_moderate: 2,
  low: 1,
}

export function calcFitScore(
  budgetCity: CityData,
  catalog: RetirementCityRecord,
  grossMonthly: number,
  lifestyle: LifestyleInputs = DEFAULT_LIFESTYLE,
  modeledAge?: number,
): number {
  const fit = calcFit(
    budgetCity,
    catalog,
    grossMonthly,
    lifestyle,
    undefined,
    modeledAge,
  )
  const qol = catalog.quality_of_life

  const surplusRatio = Math.max(0, Math.min(fit.surplus / grossMonthly, 0.5))
  const surplusScore = surplusRatio * 80

  const qolScore = qol.index ? Math.min((qol.index / 220) * 25, 25) : 10
  const healthScore = qol.healthcare ? (qol.healthcare / 100) * 15 : 8
  const visaScore = fit.visaQualifies ? 10 : 0
  const engScore = ENG_SCORE_MAP[catalog.english_proficiency] ?? 3

  return Math.round(surplusScore + qolScore + healthScore + visaScore + engScore)
}

export function taxBadgeLabel(
  rate: number,
  countryIso?: string,
  city?: string | null,
): string {
  const iso = countryIso?.toUpperCase()
  if (iso === 'FR') {
    return '0–45% (by income type)'
  }
  if (iso === 'IT') {
    return isItalyArt24TerEligibleCity(city) ? '7% flat tax' : 'Progressive IRPEF'
  }
  if (iso === 'CR') {
    return '0% foreign-source'
  }
  const pct = Math.round(rate * 100)
  if (pct <= 10) return `${pct}% flat tax`
  return `${pct}% Taxes`
}

export function taxBadgeTone(
  rate: number,
  countryIso?: string,
  city?: string | null,
): 'green' | 'amber' | 'red' {
  const iso = countryIso?.toUpperCase()
  if (iso === 'FR') return 'amber'
  if (iso === 'IT') {
    return isItalyArt24TerEligibleCity(city) ? 'green' : 'amber'
  }
  if (iso === 'CR') return 'green'
  const pct = rate * 100
  if (pct <= 10) return 'green'
  if (pct <= 30) return 'amber'
  return 'red'
}

export function cityFitCaveats(
  city: RetirementCityRecord,
  grossMonthly: number,
  fit: RetirementFitResult,
): string[] {
  const notes: string[] = []
  if (city.country_iso === 'IT') {
    if (isItalyArt24TerEligibleCity(city.city)) {
      notes.push(
        'Art. 24-ter 7% applies here (eligible southern comune ≤30k) — requires a qualifying foreign pension to elect',
      )
    } else {
      notes.push(
        'This city does not qualify for Art. 24-ter 7% — catalog Italy destinations use standard progressive IRPEF unless confirmed eligible',
      )
      notes.push(
        'IRPEF brackets are not sourced yet; local-tax estimates use a temporary planning stub',
      )
    }
  }
  if (city.country_iso === 'PT') {
    notes.push('Portugal NHR closed in 2024 — pensions face progressive rates up to 48%')
  }
  if (city.country_iso === 'CR') {
    notes.push(
      '0% applies to foreign-source retirement income; Costa Rica still taxes locally-sourced income progressively',
    )
  }
  if (city.country_iso === 'FR') {
    notes.push(
      'Social Security is taxed by France under progressive brackets (Art. 20); pension/investment income is 0–45% by amount and type — US government pensions may stay US-taxed (Art. 19)',
    )
    notes.push(
      'CSM and prélèvements sociaux can add charges on top of income tax for investment-heavy retirees',
    )
  }
  if (city.country_iso === 'NL') {
    notes.push(
      'Dutch Box 1 estimate uses age-dependent 2026 brackets plus algemene heffingskorting; arbeidskorting is excluded for pension income',
    )
  }
  if (
    city.country_iso === 'GR' &&
    city.visa.income_requirement_monthly_usd > 0 &&
    city.visa.income_requirement_monthly_usd > grossMonthly
  ) {
    notes.push('Greece visa income threshold exceeds gross monthly income')
  }
  if (
    city.tax.rate_label.toLowerCase().includes('progressive') &&
    fit.taxRate > 0.3
  ) {
    notes.push('High tax significantly reduces take-home')
  }
  return notes
}
