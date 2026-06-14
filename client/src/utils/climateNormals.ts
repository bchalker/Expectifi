import climateNormalsCombined from '../data/climate-normals.json'
import type { CityClimate } from '../lib/api/openMeteo'

type ClimateNormalsFile = {
  metadata: {
    generated: string
    source: string
    source_period: string
    model: string
    total_cities: number
    valid_count: number
    null_count: number
  }
  cities: Record<string, CityClimate | null>
}

const combined = climateNormalsCombined as unknown as ClimateNormalsFile
const dataset = combined.cities

function cityKey(city: string, country: string): string {
  return `${city.trim()}|${country.trim()}`
}

/** Pre-generated Open-Meteo normals keyed city|country (bundled map coordinates). */
export function getCityClimateNormals(city: string, country: string): CityClimate | null {
  const hit = dataset[cityKey(city, country)]
  if (!hit?.monthly?.length) return null
  return hit
}
