import combined from '../data/retirement-destinations-combined.json'

export type RetirementCityRecord = {
  city: string
  country: string
  country_iso: string
  lat: number | null
  lng: number | null
  col: {
    rent_1br_outside: number
    rent_1br_center: number
    utilities: number
    transport_monthly: number
    meal_inexpensive: number
    avg_net_salary: number | null
  }
  col_computed: {
    base_monthly: number
    full_monthly_with_health_ins: number
    health_insurance_est: number
    meals_45x: number
  }
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

let cachedCities: RetirementCityRecord[] | null = null

export function getRetirementDestinationCities(): RetirementCityRecord[] {
  if (!cachedCities) {
    cachedCities = dataset.cities.filter(
      (c) =>
        Number.isFinite(c.col_computed.base_monthly) &&
        c.col_computed.base_monthly > 0,
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
