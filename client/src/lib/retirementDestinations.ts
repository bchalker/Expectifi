import combined from '../data/retirement-destinations-combined.json'
import { getCityData } from '../utils/costOfLiving'

export type RetirementCityRecord = {
  city: string
  country: string
  country_iso: string
  lat: number | null
  lng: number | null
  tax: {
    rate_label: string
    key_exemptions: string
    us_tax_treaty: boolean
    top_reason: string
  }
  visa: {
    name: string
    income_requirement_str: string
    income_requirement_monthly_usd: number
    summary: string
    healthcare_notes: string
  }
  quality_of_life: {
    index: number | null
    safety: number | null
    healthcare: number | null
    climate: number | null
    purchasing_power: number | null
  }
  english_proficiency: string
  expat: {
    community_size: string
    estimated_americans: string
    expat_vibe: string
    popular_areas: string[]
  }
  getting_there: {
    direct_from_us: boolean
    direct_us_cities: string[]
  }
}

type CombinedFile = {
  metadata: { disclaimer: string }
  cities: RetirementCityRecord[]
}

const dataset = combined as CombinedFile

/** True when the city has usable COL data in cost-of-living.csv (same gate the map uses). */
function hasCatalogCostData(city: string, country: string): boolean {
  const csv = getCityData(city, country)
  return csv != null && csv.rent_1br_outside_centre > 0
}

let cachedCities: RetirementCityRecord[] | null = null

export function getRetirementDestinationCities(): RetirementCityRecord[] {
  if (!cachedCities) {
    cachedCities = dataset.cities.filter((c) =>
      hasCatalogCostData(c.city, c.country),
    )
  }
  return cachedCities
}

export function retirementDestinationsDisclaimer(): string {
  return dataset.metadata.disclaimer
}

export function cityRecordId(city: RetirementCityRecord): string {
  return `${city.city}|${city.country}`
}
