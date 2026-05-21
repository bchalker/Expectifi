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

/** Monthly food budget: inexpensive meal × 45, rounded to nearest dollar. */
export function monthlyFoodEstimate(mealInexpensiveRestaurant: number): number {
  if (!Number.isFinite(mealInexpensiveRestaurant) || mealInexpensiveRestaurant <= 0) return 0
  return Math.round(mealInexpensiveRestaurant * 45)
}

export function rentCardHeaderSubtitle(): string {
  return '1BR (outside center)'
}

export function formatGasolineDualPrice(pricePerLiter: number): string {
  if (!Number.isFinite(pricePerLiter) || pricePerLiter <= 0) return '—'
  const perGallon = pricePerLiter * LITERS_PER_US_GALLON
  return `${formatUsdOrDash(perGallon)}/${formatUsdOrDash(pricePerLiter)}`
}
