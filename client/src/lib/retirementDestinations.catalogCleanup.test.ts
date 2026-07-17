import { describe, expect, it } from 'vitest'
import {
  getRetirementDestinationCities,
} from './retirementDestinations'
import {
  calculateMonthlyBudget,
  DEFAULT_LIFESTYLE,
  getAllMapCities,
  getCityData,
} from '../utils/costOfLiving'
import { monthlyBudgetForScoring } from './whereToRetire/cityMapScoring'

const SIX = [
  ['Davao', 'Philippines'],
  ['Sorocaba', 'Brazil'],
  ['Londrina', 'Brazil'],
  ['Maringa', 'Brazil'],
  ['Trnava', 'Slovakia'],
  ['Whangarei', 'New Zealand'],
] as const

describe('catalog COL proxy cleanup', () => {
  it('includes the six cities previously dropped by base_monthly null', () => {
    const catalog = getRetirementDestinationCities()
    expect(catalog.length).toBe(639)
    for (const [city, country] of SIX) {
      const hit = catalog.find((c) => c.city === city && c.country === country)
      expect(hit, `${city}|${country}`).toBeTruthy()
      expect((hit as { col?: unknown }).col).toBeUndefined()
      expect((hit as { col_computed?: unknown }).col_computed).toBeUndefined()
    }
  })

  it('catalog cost for the six cities matches map calculateMonthlyBudget', () => {
    const mapById = new Map(getAllMapCities().map((c) => [c.id, c]))
    for (const [city, country] of SIX) {
      const csv = getCityData(city, country)
      expect(csv, city).toBeTruthy()
      expect(csv!.rent_1br_outside_centre).toBeGreaterThan(0)
      const mapCity = mapById.get(`${city}|${country}`)
      expect(mapCity, `map ${city}`).toBeTruthy()
      const catalogBudget = calculateMonthlyBudget(csv!, DEFAULT_LIFESTYLE).total
      const mapBudget = monthlyBudgetForScoring(mapCity!)
      expect(catalogBudget).toBe(mapBudget)
    }
  })

  it('keeps only cities with CSV rent data', () => {
    for (const c of getRetirementDestinationCities()) {
      const csv = getCityData(c.city, c.country)
      expect(csv?.rent_1br_outside_centre ?? 0).toBeGreaterThan(0)
    }
  })
})
