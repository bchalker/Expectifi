import { getTaxVisaData } from './taxVisa'
import { hasRetirementVisaProgram } from './mapTaxVisaFilters'

export type ResidencyEaseFields = {
  retirement_visa_available: boolean
  residency_years_to_permanent: number
  min_income_required_usd: number
  english_friendly_process: boolean
}

const DEFAULT_RESIDENCY_EASE: ResidencyEaseFields = {
  retirement_visa_available: false,
  residency_years_to_permanent: 10,
  min_income_required_usd: 30000,
  english_friendly_process: false,
}

export type ResidencyEaseScoreOptions = {
  /** User gross monthly retirement income (USD) — used for visa qualification check. */
  monthlyIncome?: number
}

export function getResidencyEaseFields(country: string): ResidencyEaseFields | null {
  const data = getTaxVisaData(country)
  if (!data) return null
  if (
    data.retirement_visa_available == null &&
    data.residency_years_to_permanent == null &&
    data.min_income_required_usd == null &&
    data.english_friendly_process == null
  ) {
    return null
  }
  return {
    retirement_visa_available:
      data.retirement_visa_available ?? hasRetirementVisaProgram(country),
    residency_years_to_permanent:
      data.residency_years_to_permanent ?? DEFAULT_RESIDENCY_EASE.residency_years_to_permanent,
    min_income_required_usd:
      data.min_income_required_usd ?? DEFAULT_RESIDENCY_EASE.min_income_required_usd,
    english_friendly_process:
      data.english_friendly_process ?? DEFAULT_RESIDENCY_EASE.english_friendly_process,
  }
}

/**
 * Residency ease score (0–100) from structured country fields.
 * Base 50; bonuses/penalties per admin dataset.
 */
export function computeResidencyEaseScore(
  country: string,
  options: ResidencyEaseScoreOptions = {},
): number {
  const fields = getResidencyEaseFields(country)
  if (!fields) {
    if (country.trim() === 'United States') return 85
    return hasRetirementVisaProgram(country) ? 75 : 20
  }

  let score = 50

  if (!fields.retirement_visa_available) score -= 30

  const years = fields.residency_years_to_permanent
  if (years > 10) score -= 20
  else if (years > 5) score -= 5
  else score += 10

  if (!fields.english_friendly_process) score -= 10

  const monthlyIncome = options.monthlyIncome
  if (
    monthlyIncome != null &&
    monthlyIncome > 0 &&
    fields.min_income_required_usd > monthlyIncome * 12
  ) {
    score -= 40
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function residencyVisaAvailable(country: string): boolean {
  const fields = getResidencyEaseFields(country)
  if (fields) return fields.retirement_visa_available
  if (country.trim() === 'United States') return true
  return hasRetirementVisaProgram(country)
}

export function residencyEaseSummary(fields: ResidencyEaseFields): string {
  const parts: string[] = []
  parts.push(fields.retirement_visa_available ? 'Retirement visa available' : 'No dedicated retirement visa')
  parts.push(`Permanent residency ~${fields.residency_years_to_permanent} years`)
  parts.push(`Income requirement ~$${fields.min_income_required_usd.toLocaleString('en-US')}/yr`)
  parts.push(
    fields.english_friendly_process ? 'English-friendly immigration process' : 'Limited English-language process',
  )
  return parts.join(' · ')
}
