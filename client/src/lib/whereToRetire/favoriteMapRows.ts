import { getFlagEmoji } from '../regionUtils'
import {
  getEffectiveTaxRate,
  taxBadgeLabel,
  taxBadgeTone,
} from '../retirementFormulas'
import type { FavoriteCityEntry } from '../retirementStorage'
import type { MapFilters } from './cityMapScoring'
import { calcMapIncomeFit } from './mapIncomeFit'
import { lookupRetirementCity } from './retirementCityLookup'
import {
  calculateMonthlyBudget,
  countryToFlagEmoji,
  countryToIsoCode,
  formatUsd,
  getAllMapCities,
  type MapCity,
} from '../../utils/costOfLiving'

export type FavoriteMapRow = {
  entry: FavoriteCityEntry
  flag: string
  label: string
  surplus: number
  taxLabel: string
  taxTone: 'green' | 'amber' | 'red'
}

function cityCountryKey(city: string, country: string): string {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`
}

let mapCityByKey: Map<string, MapCity> | null = null

function lookupMapCity(city: string, country: string): MapCity | null {
  if (!mapCityByKey) {
    mapCityByKey = new Map()
    for (const c of getAllMapCities()) {
      mapCityByKey.set(cityCountryKey(c.city, c.country), c)
    }
  }
  return mapCityByKey.get(cityCountryKey(city, country)) ?? null
}

function resolveFavoriteIso(
  entry: FavoriteCityEntry,
  recordIso?: string,
): string {
  if (entry.country_iso) return entry.country_iso
  if (recordIso) return recordIso
  return countryToIsoCode(entry.country) ?? ''
}

function favoriteSurplusAndTax(
  entry: FavoriteCityEntry,
  monthlyIncome: number,
  filters: Pick<MapFilters, 'includeHealthIns' | 'healthInsMonthlyUsd'>,
): { surplus: number; taxRate: number } {
  const record = lookupRetirementCity(entry.city, entry.country)
  if (record) {
    const fit = calcMapIncomeFit(record, monthlyIncome, filters)
    return { surplus: fit.surplus, taxRate: fit.taxRate }
  }

  const mapCity = lookupMapCity(entry.city, entry.country)
  const iso = resolveFavoriteIso(entry)
  const taxRate = getEffectiveTaxRate(iso)
  if (!mapCity) {
    return { surplus: 0, taxRate }
  }

  const budget = calculateMonthlyBudget(mapCity)
  const health = filters.includeHealthIns ? filters.healthInsMonthlyUsd : 0
  const netIncome = monthlyIncome * (1 - taxRate)
  return { surplus: netIncome - budget - health, taxRate }
}

export function buildFavoriteMapRows(
  favorites: FavoriteCityEntry[],
  monthlyIncome: number,
  filters: Pick<MapFilters, 'includeHealthIns' | 'healthInsMonthlyUsd'>,
): FavoriteMapRow[] {
  const rows: FavoriteMapRow[] = []

  for (const entry of favorites) {
    const record = lookupRetirementCity(entry.city, entry.country)
    const iso = resolveFavoriteIso(entry, record?.country_iso)
    const { surplus, taxRate } = favoriteSurplusAndTax(entry, monthlyIncome, filters)
    const flag = iso.length === 2 ? getFlagEmoji(iso) : countryToFlagEmoji(entry.country)

    rows.push({
      entry,
      flag,
      label: `${entry.city}, ${entry.country}`,
      surplus,
      taxLabel: taxBadgeLabel(taxRate),
      taxTone: taxBadgeTone(taxRate),
    })
  }

  return rows.sort((a, b) => b.surplus - a.surplus)
}

export function formatFavoriteSurplus(surplus: number): string {
  const sign = surplus >= 0 ? '+' : '−'
  return `${sign}${formatUsd(Math.abs(surplus))}`
}
