import climateNormalsCombined from '../data/climate-normals.json'
import type { CityClimate } from '../lib/api/openMeteo'
import { formatYearMonthLabel } from './formatYearMonth'

type ClimateNormalsFile = {
  metadata: {
    generated: string
    source: string
    /** Historical baseline window for the normals (e.g. `2011-2020`). */
    default_source_period: string
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

export function getClimateNormalsSourcePeriod(): string {
  return combined.metadata.default_source_period
}

export function getClimateNormalsGenerated(): string {
  return combined.metadata.generated
}

/**
 * Dual stamp for static normals only — baseline period vs file regen date.
 * Do not use for live Open-Meteo responses.
 */
export function climateNormalsFreshnessMessage(): string {
  const period = getClimateNormalsSourcePeriod()
  const generated = formatYearMonthLabel(getClimateNormalsGenerated())
  return `Climate normals based on ${period} averages, refreshed ${generated}.`
}
