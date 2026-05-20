import { formatUsdOrDash } from './costOfLiving'

const APARTMENT_AREA_SQM = 85
const SQFT_PER_SQM = 10.763910416709722
const LITERS_PER_US_GALLON = 3.785411784

export function apartmentAreaSqFt(): number {
  return Math.round(APARTMENT_AREA_SQM * SQFT_PER_SQM)
}

/** e.g. "915 sq ft (85 sq m)" */
export function apartmentAreaDualLabel(): string {
  return `${apartmentAreaSqFt()} sq ft (${APARTMENT_AREA_SQM} sq m)`
}

export function utilitiesCardSubtitle(): string {
  return `Electricity, water & heating (based on ${apartmentAreaSqFt()} sq ft / ${APARTMENT_AREA_SQM} sq m apartment)`
}

export function foodCardSubtitle(): string {
  return 'Based on 45 inexpensive meals/month'
}

export function formatGasolineDualPrice(pricePerLiter: number): string {
  if (!Number.isFinite(pricePerLiter) || pricePerLiter <= 0) return '—'
  const perGallon = pricePerLiter * LITERS_PER_US_GALLON
  return `${formatUsdOrDash(perGallon)}/gal (${formatUsdOrDash(pricePerLiter)}/L)`
}
