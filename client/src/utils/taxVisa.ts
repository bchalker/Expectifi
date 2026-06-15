import taxVisaDataset from '../data/retirement-tax-visa.json'

export type PublicBehaviorLaws = 'strict' | 'moderate' | 'open'

export type TaxVisaCountryData = {
  tax_rate_label: string
  tax_summary: string
  key_exemptions: string
  visa_name: string
  visa_income_requirement: string
  visa_summary: string
  healthcare_notes: string
  us_tax_treaty: boolean
  top_reason: string
  retirement_visa_available?: boolean
  residency_years_to_permanent?: number
  min_income_required_usd?: number
  english_friendly_process?: boolean
  alcohol_restricted?: boolean
  dress_code_enforced?: boolean
  religious_law_basis?: boolean
  public_behavior_laws?: PublicBehaviorLaws
  estimated_expat_insurance_usd?: number
  disaster_risk_score?: number
  stability_score?: number
  official_language?: string
  language_difficulty?: 'easy' | 'moderate' | 'hard' | 'very_hard'
  avg_broadband_mbps?: number
  flight_hours_from_us?: number
}

type TaxVisaDatasetFile = {
  metadata: {
    last_updated: string
    disclaimer: string
    sources: string[]
  }
  countries: Record<string, TaxVisaCountryData>
}

const dataset = taxVisaDataset as TaxVisaDatasetFile

export const TAX_VISA_FOREIGN_INCOME_NOTE =
  'US citizens remain subject to IRS filing requirements on worldwide income regardless of local tax rules.'

/** Explains headline tax rate for US / Canadian retirees (shown under Tax rate card). */
export const TAX_RATE_HOME_COUNTRY_NOTE =
  'The rate shown is the host country’s income tax on local earnings — not an extra US or Canadian tax on top of what you already owe at home. US citizens must still file with the IRS on worldwide income; you may offset host-country tax via the Foreign Tax Credit or treaty rules. Canadian residents report foreign income to CRA and can usually claim a foreign tax credit for tax paid abroad. This app does not model your full home-country liability — consult a cross-border tax advisor.'

/** Body after the bold "Sources:" lead-in in the Tax & Visa tab footer. */
export const TAX_VISA_TAB_DISCLAIMER_BODY =
  'IRS, Greenback Tax Services, International Living, US State Department. Educational estimates only — not tax, legal, or immigration advice. Rules change frequently. Verify with a qualified professional before relocating.'

export const TAX_VISA_UNAVAILABLE_MESSAGE =
  'Detailed tax and visa information not yet available for this destination. Consult a qualified expat tax professional and the US Embassy website for current requirements.'

const TAX_VISA_SCOPE_OVERRIDES: Record<string, string> = {
  Italy:
    'Tax rate shown is the national 7% special regime for qualifying southern municipalities. Standard rates apply elsewhere.',
  Switzerland:
    'Income tax rates vary significantly by canton. Rates shown are approximate national averages.',
  'United States':
    'Federal tax rules apply nationwide. State income tax varies — 9 states have no income tax.',
  Spain: 'National rates shown. Some regions have additional taxes or variations.',
  Germany: 'Federal rates shown. State (Länder) solidarity surcharge applies.',
}

export type TaxVisaScopeLabel = {
  text: string
  /** True when copy describes regional variation (info icon); otherwise globe icon. */
  regional: boolean
}

/** Scope note shown in city detail pagination when Tax & Visa tab is active. */
export function getTaxVisaScopeLabel(country: string): TaxVisaScopeLabel {
  const trimmed = country.trim()
  const override = TAX_VISA_SCOPE_OVERRIDES[trimmed]
  if (override) {
    return { text: override, regional: true }
  }
  return {
    text: trimmed ? `Tax and visa rules apply to all of ${trimmed}` : 'Tax and visa rules apply nationwide',
    regional: false,
  }
}

/** Tax and visa content for a country name (must match dataset keys, e.g. "Portugal"). */
export function getTaxVisaData(country: string): TaxVisaCountryData | null {
  const trimmed = country.trim()
  if (!trimmed) return null
  return dataset.countries[trimmed] ?? null
}

/** Comparison table cell values for Tax & Visa rows. */
export function getTaxVisaRowValue(data: TaxVisaCountryData | null, rowId: string): string {
  if (!data) return '—'
  switch (rowId) {
    case 'taxRate':
      return data.tax_rate_label
    case 'exemptions':
      return data.key_exemptions
    case 'visa':
      return `${data.visa_name} — ${data.visa_income_requirement}`
    case 'healthcare':
      return data.healthcare_notes
    default:
      return '—'
  }
}
