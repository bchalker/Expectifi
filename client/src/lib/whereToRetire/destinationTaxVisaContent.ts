import { US_FEDERAL_NOTE } from '../../data/retirementTaxDetail'
import { getCountryTaxForCityCountry } from './countryTaxForCity'

export type TaxVisaFieldRow = {
  id: string
  label: string
  sublabel?: string
  value: string
}

export type DestinationTaxVisaContent = {
  taxSectionTitle: string
  visaSectionTitle: string
  rows: TaxVisaFieldRow[]
}

function buildExemptionsText(
  rateDescription: string,
  usExpatNotes: string,
  detailNote: string,
): string {
  const parts = [rateDescription, detailNote, usExpatNotes].filter(Boolean)
  return parts.join(' ')
}

/** Single source for Tax & Visa tab and comparison table rows. */
export function getDestinationTaxVisaContent(country: string): DestinationTaxVisaContent | null {
  const entry = getCountryTaxForCityCountry(country)
  if (!entry) return null

  const detail = entry.retirementTaxDetail
  const exemptions = buildExemptionsText(
    entry.rateDescription,
    entry.usExpatNotes,
    detail.effectiveCombinedNote,
  )

  return {
    taxSectionTitle: 'Retirement Income Tax',
    visaSectionTitle: 'Residency & Healthcare',
    rows: [
      {
        id: 'taxRate',
        label: 'Tax rate on retirement income',
        sublabel: US_FEDERAL_NOTE,
        value: detail.localRateLabel || entry.rateDescription,
      },
      {
        id: 'exemptions',
        label: 'Key retirement income exemptions',
        value: exemptions,
      },
      {
        id: 'visa',
        label: 'Visa / residency requirement',
        value: entry.visaNotes,
      },
      {
        id: 'healthcare',
        label: 'Healthcare notes',
        value: entry.healthcareNotes,
      },
    ],
  }
}

export function getTaxVisaRowValue(
  content: DestinationTaxVisaContent | null,
  rowId: string,
): string {
  if (!content) return '—'
  return content.rows.find((r) => r.id === rowId)?.value ?? '—'
}
