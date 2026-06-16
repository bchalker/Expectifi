import csvRaw from '../data/cost-of-living.csv?raw'
import cityCoordinates from '../data/city-coordinates.json'
import { formatMoney } from '../lib/displayCurrency'

export type CityData = {
  city: string
  country: string
  meal_inexpensive_restaurant: number
  meal_midrange_restaurant_for2: number
  mcmeal: number
  domestic_beer_draught: number
  imported_beer_bottle: number
  cappuccino: number
  wine_bottle_midrange: number
  milk_1L: number
  bread_500g: number
  rice_1kg: number
  eggs_12: number
  cheese_1kg: number
  chicken_1kg: number
  beef_1kg: number
  apples_1kg: number
  banana_1kg: number
  oranges_1kg: number
  tomato_1kg: number
  potato_1kg: number
  onion_1kg: number
  lettuce: number
  water_1_5L_bottle: number
  domestic_beer_bottle: number
  transport_one_way_ticket: number
  transport_monthly_pass: number
  taxi_start: number
  taxi_per_km: number
  mobile_plan_monthly_usd: number
  mobile_tariff_per_min: number
  tennis_court_1hr: number
  utilities_monthly_85m2: number
  internet_60mbps_monthly: number
  rent_1br_outside_centre: number
  rent_1br_city_centre: number
  rent_3br_city_centre: number
  rent_3br_outside_centre: number
  avg_monthly_net_salary: number
  gym_monthly: number
  cinema_ticket: number
  gasoline_1L: number
  jeans_levis: number
  summer_dress: number
  nike_running_shoes: number
  mens_leather_shoes: number
  data_quality: number
}

export type MapCity = CityData & {
  id: string
  lat: number
  lng: number
}

const CITY_DATA_FIELDS: (keyof CityData)[] = [
  'city',
  'country',
  'meal_inexpensive_restaurant',
  'meal_midrange_restaurant_for2',
  'mcmeal',
  'domestic_beer_draught',
  'imported_beer_bottle',
  'cappuccino',
  'wine_bottle_midrange',
  'milk_1L',
  'bread_500g',
  'rice_1kg',
  'eggs_12',
  'cheese_1kg',
  'chicken_1kg',
  'beef_1kg',
  'apples_1kg',
  'banana_1kg',
  'oranges_1kg',
  'tomato_1kg',
  'potato_1kg',
  'onion_1kg',
  'lettuce',
  'water_1_5L_bottle',
  'domestic_beer_bottle',
  'transport_one_way_ticket',
  'transport_monthly_pass',
  'taxi_start',
  'taxi_per_km',
  'mobile_plan_monthly_usd',
  'mobile_tariff_per_min',
  'tennis_court_1hr',
  'utilities_monthly_85m2',
  'internet_60mbps_monthly',
  'rent_1br_outside_centre',
  'rent_1br_city_centre',
  'rent_3br_city_centre',
  'rent_3br_outside_centre',
  'avg_monthly_net_salary',
  'gym_monthly',
  'cinema_ticket',
  'gasoline_1L',
  'jeans_levis',
  'summer_dress',
  'nike_running_shoes',
  'mens_leather_shoes',
  'data_quality',
]

function buildColumnIndex(headerLine: string): Record<string, number> {
  return Object.fromEntries(
    headerLine
      .trim()
      .split(',')
      .map((name, index) => [name.replace(/\r$/, ''), index]),
  )
}

const CSV_COLUMN_INDEX = buildColumnIndex(csvRaw.split('\n')[0] ?? '')

function parseNumber(value: string | undefined): number {
  const n = Number((value ?? '0').replace(/\r/g, ''))
  return Number.isFinite(n) ? n : 0
}

function parseCityRow(parts: string[]): CityData {
  const row = {} as CityData
  for (const field of CITY_DATA_FIELDS) {
    const idx = CSV_COLUMN_INDEX[field]
    const raw = parts[idx] ?? '0'
    if (field === 'city' || field === 'country') {
      row[field] = raw.replace(/\r/g, '')
    } else {
      row[field] = parseNumber(raw)
    }
  }
  return row
}

function cityKey(city: string, country: string): string {
  return `${city}|${country}`
}

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase()
}

/** Omitted from map, lists, and counts — applied when city rows are first loaded. */
export const EXCLUDED_COUNTRIES = [
  'Russia',
  'Belarus',
  'Iran',
  'Syria',
  'Cuba',
  'Ukraine',
  'Myanmar',
  'North Korea',
  'Yemen',
  'Sudan',
  'Somalia',
  'Libya',
] as const

const EXCLUDED_COUNTRY_KEYS = new Set(
  EXCLUDED_COUNTRIES.map((c) => normalizeLookup(c)),
)

export function isExcludedCountry(country: string): boolean {
  return EXCLUDED_COUNTRY_KEYS.has(normalizeLookup(country))
}

/** Level 4 — default-exclude and “Hide unsafe cities” filter. */
export { hasDoNotTravelAdvisory as hasTravelAdvisory } from '../lib/travelAdvisories'

let cachedCities: CityData[] | null = null
let cachedMapCities: MapCity[] | null = null

function loadAllCityRows(): CityData[] {
  if (cachedCities) return cachedCities
  const lines = csvRaw.trim().split('\n').slice(1)
  cachedCities = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => parseCityRow(line.split(',')))
    .filter((row) => !isExcludedCountry(row.country))
  return cachedCities
}

function coordsFor(city: string, country: string): { lat: number; lng: number } | null {
  const hit = cityCoordinates[cityKey(city, country) as keyof typeof cityCoordinates]
  return hit ?? null
}

export function getAllCities(): CityData[] {
  return loadAllCityRows()
}

export function getCityData(city: string, country?: string): CityData | null {
  const targetCity = normalizeLookup(city)
  const targetCountry = country ? normalizeLookup(country) : null

  const matches = loadAllCityRows().filter((row) => {
    if (normalizeLookup(row.city) !== targetCity) return false
    if (targetCountry && normalizeLookup(row.country) !== targetCountry) return false
    return true
  })

  if (!matches.length) return null
  if (matches.length === 1) return matches[0]

  if (targetCountry) {
    return matches.find((row) => normalizeLookup(row.country) === targetCountry) ?? matches[0]
  }

  return matches[0]
}

export function getAllMapCities(): MapCity[] {
  if (cachedMapCities) return cachedMapCities

  cachedMapCities = loadAllCityRows()
    .filter((row) => row.rent_1br_outside_centre > 0)
    .map((row) => {
      const coords = coordsFor(row.city, row.country)
      if (!coords) return null
      return {
        ...row,
        id: cityKey(row.city, row.country),
        lat: coords.lat,
        lng: coords.lng,
      }
    })
    .filter((row): row is MapCity => row != null)

  return cachedMapCities
}

export type HousingTier =
  | '1br_outside'
  | '1br_centre'
  | '3br_outside'
  | '3br_centre'

export interface LifestyleInputs {
  diningCasualPerWeek: number
  diningNicePerMonth: number
  coffeeShopPerWeek: number
  beerHomePerWeek: number
  beerOutPerWeek: number
  winePerMonth: number
  gym: boolean
  cinemaPerMonth: number
  taxiRidesPerMonth: number
  housing: HousingTier
  healthInsuranceMonthlyUsd: number
  includeSpouse: boolean
  includeMobile: boolean
  includeClothing: boolean
  includeIncidentals: boolean
  clothingMultiplier: number
  incidentalsPct: number
}

export interface BudgetBreakdown {
  rent: number
  groceries: number
  dining: number
  alcohol: number
  transport: number
  utilities: number
  mobile: number
  leisure: number
  clothing: number
  incidentals: number
  healthInsurance: number
  total: number
}

export type Intensity = 'lean' | 'typical' | 'comfortable'

/**
 * Magnitudes used WHEN a category is included. Intensity no longer means
 * "on/off" — that's a separate per-category boolean. Intensity means "if
 * you do this, how often/how much."
 */
export const INTENSITY_TABLE: Record<
  Intensity,
  {
    diningCasualPerWeek: number
    diningNicePerMonth: number
    coffeeShopPerWeek: number
    beerHomePerWeek: number
    beerOutPerWeek: number
    winePerMonth: number
    cinemaPerMonth: number
    taxiRidesPerMonth: number
    clothingMultiplier: number
    incidentalsPct: number
  }
> = {
  lean: {
    diningCasualPerWeek: 1,
    diningNicePerMonth: 0.5,
    coffeeShopPerWeek: 1,
    beerHomePerWeek: 2,
    beerOutPerWeek: 1,
    winePerMonth: 1,
    cinemaPerMonth: 1,
    taxiRidesPerMonth: 1,
    clothingMultiplier: 0.5,
    incidentalsPct: 0.05,
  },
  typical: {
    diningCasualPerWeek: 2,
    diningNicePerMonth: 1,
    coffeeShopPerWeek: 2,
    beerHomePerWeek: 2,
    beerOutPerWeek: 1,
    winePerMonth: 2,
    cinemaPerMonth: 2,
    taxiRidesPerMonth: 2,
    clothingMultiplier: 1,
    incidentalsPct: 0.08,
  },
  comfortable: {
    diningCasualPerWeek: 4,
    diningNicePerMonth: 4,
    coffeeShopPerWeek: 5,
    beerHomePerWeek: 3,
    beerOutPerWeek: 3,
    winePerMonth: 6,
    cinemaPerMonth: 4,
    taxiRidesPerMonth: 8,
    clothingMultiplier: 1.75,
    incidentalsPct: 0.12,
  },
}

/** Annual clothing replacement basket — divided by 12 in calculateMonthlyBudget. */
export const CLOTHING_BASKET: Record<string, number> = {
  jeans_levis: 2,
  summer_dress: 1,
  nike_running_shoes: 1,
  mens_leather_shoes: 0.5,
}

/**
 * User-facing budget panel state. This is what gets persisted/serialized —
 * NOT LifestyleInputs (that's derived).
 */
export interface BudgetPreferences {
  intensity: Intensity
  includeCasualDining: boolean
  includeUpscaleDining: boolean
  includeCoffee: boolean
  includeAlcohol: boolean
  includeGym: boolean
  includeCinema: boolean
  includeTaxi: boolean
  includeMobile: boolean
  includeClothing: boolean
  includeIncidentals: boolean
  housing: HousingTier
  includeHealthInsurance: boolean
  healthInsuranceMonthlyUsd: number
  includeSpouse: boolean
}

export const DEFAULT_BUDGET_PREFERENCES: BudgetPreferences = {
  intensity: 'typical',
  includeCasualDining: true,
  includeUpscaleDining: true,
  includeCoffee: true,
  includeAlcohol: true,
  includeGym: true,
  includeCinema: true,
  includeTaxi: true,
  includeMobile: true,
  includeClothing: true,
  includeIncidentals: true,
  housing: '1br_outside',
  includeHealthInsurance: true,
  healthInsuranceMonthlyUsd: 250,
  includeSpouse: false,
}

/** Derives the flat calculator input from panel state. */
export function buildLifestyleInputs(prefs: BudgetPreferences): LifestyleInputs {
  const v = INTENSITY_TABLE[prefs.intensity]
  return {
    diningCasualPerWeek: prefs.includeCasualDining ? v.diningCasualPerWeek : 0,
    diningNicePerMonth: prefs.includeUpscaleDining ? v.diningNicePerMonth : 0,
    coffeeShopPerWeek: prefs.includeCoffee ? v.coffeeShopPerWeek : 0,
    beerHomePerWeek: prefs.includeAlcohol ? v.beerHomePerWeek : 0,
    beerOutPerWeek: prefs.includeAlcohol ? v.beerOutPerWeek : 0,
    winePerMonth: prefs.includeAlcohol ? v.winePerMonth : 0,
    gym: prefs.includeGym,
    cinemaPerMonth: prefs.includeCinema ? v.cinemaPerMonth : 0,
    taxiRidesPerMonth: prefs.includeTaxi ? v.taxiRidesPerMonth : 0,
    housing: prefs.housing,
    healthInsuranceMonthlyUsd: prefs.includeHealthInsurance
      ? prefs.healthInsuranceMonthlyUsd
      : 0,
    includeSpouse: prefs.includeSpouse,
    includeMobile: prefs.includeMobile,
    includeClothing: prefs.includeClothing,
    includeIncidentals: prefs.includeIncidentals,
    clothingMultiplier: v.clothingMultiplier,
    incidentalsPct: v.incidentalsPct,
  }
}

export const DEFAULT_LIFESTYLE: LifestyleInputs = buildLifestyleInputs(
  DEFAULT_BUDGET_PREFERENCES,
)

export function budgetPreferencesEqual(
  a: BudgetPreferences,
  b: BudgetPreferences,
): boolean {
  return (Object.keys(a) as (keyof BudgetPreferences)[]).every(
    (key) => a[key] === b[key],
  )
}

const WEEKS_PER_MONTH = 4.33

export const GROCERY_BASKET_STAPLE_COUNT = 15

/** Display labels for the monthly grocery basket (quantities baked into labels). */
export const GROCERY_BASKET_STAPLES: readonly { label: string }[] = [
  { label: 'Milk 6L' },
  { label: 'Bread 6 loaves' },
  { label: 'Rice 1.5kg' },
  { label: 'Eggs 24' },
  { label: 'Cheese 0.75kg' },
  { label: 'Chicken 2.5kg' },
  { label: 'Beef 1kg' },
  { label: 'Apples 2kg' },
  { label: 'Bananas 2kg' },
  { label: 'Oranges 1.5kg' },
  { label: 'Tomatoes 2kg' },
  { label: 'Potatoes 2kg' },
  { label: 'Onions 1kg' },
  { label: 'Lettuce 3 heads' },
  { label: 'Bottled water 4 bottles' },
]

const GROCERY_BASKET: Record<string, number> = {
  milk_1L: 6,
  bread_500g: 6,
  rice_1kg: 1.5,
  eggs_12: 2,
  cheese_1kg: 0.75,
  chicken_1kg: 2.5,
  beef_1kg: 1,
  apples_1kg: 2,
  banana_1kg: 2,
  oranges_1kg: 1.5,
  tomato_1kg: 2,
  potato_1kg: 2,
  onion_1kg: 1,
  lettuce: 3,
  water_1_5L_bottle: 4,
}

const RENT_FIELD: Record<HousingTier, keyof CityData> = {
  '1br_outside': 'rent_1br_outside_centre',
  '1br_centre': 'rent_1br_city_centre',
  '3br_outside': 'rent_3br_outside_centre',
  '3br_centre': 'rent_3br_city_centre',
}

const TRANSPORT_PASS_FALLBACK_RIDES_PER_MONTH = 40
const MOBILE_PLAN_FALLBACK_USD = 20

function cityPrice(city: CityData, key: keyof CityData, fallback = 0): number {
  const v = Number(city[key])
  return Number.isFinite(v) && v > 0 ? v : fallback
}

export type BudgetLineItem = {
  label: string
  amount: number
}

export function buildDiningBudgetLineItems(
  city: CityData,
  lifestyle: LifestyleInputs,
): BudgetLineItem[] {
  const adults = lifestyle.includeSpouse ? 2 : 1
  const casualMealsPerMonth = lifestyle.diningCasualPerWeek * WEEKS_PER_MONTH
  const coffeesPerMonth = lifestyle.coffeeShopPerWeek * WEEKS_PER_MONTH
  const items: BudgetLineItem[] = []

  if (casualMealsPerMonth > 0) {
    items.push({
      label: `Casual meals (${Math.round(casualMealsPerMonth)}x/mo)`,
      amount: Math.round(
        casualMealsPerMonth * cityPrice(city, 'meal_inexpensive_restaurant') * adults,
      ),
    })
  }
  if (lifestyle.diningNicePerMonth > 0) {
    items.push({
      label: `Dinner for two (${Math.round(lifestyle.diningNicePerMonth)}x/mo)`,
      amount: Math.round(
        lifestyle.diningNicePerMonth * cityPrice(city, 'meal_midrange_restaurant_for2'),
      ),
    })
  }
  if (coffeesPerMonth > 0) {
    items.push({
      label: `Coffee shop (${Math.round(coffeesPerMonth)}x/mo)`,
      amount: Math.round(coffeesPerMonth * cityPrice(city, 'cappuccino') * adults),
    })
  }
  if (lifestyle.diningCasualPerWeek > 0) {
    items.push({
      label: 'Fast food (2x/mo)',
      amount: Math.round(2 * cityPrice(city, 'mcmeal') * adults),
    })
  }

  return items
}

export function buildAlcoholBudgetLineItems(
  city: CityData,
  lifestyle: LifestyleInputs,
): BudgetLineItem[] {
  const adults = lifestyle.includeSpouse ? 2 : 1
  const beerHomePerMonth = lifestyle.beerHomePerWeek * WEEKS_PER_MONTH
  const beerOutPerMonth = lifestyle.beerOutPerWeek * WEEKS_PER_MONTH
  const items: BudgetLineItem[] = []

  if (beerHomePerMonth > 0) {
    items.push({
      label: `Beer at home (${Math.round(beerHomePerMonth)}x/mo)`,
      amount: Math.round(
        beerHomePerMonth * cityPrice(city, 'domestic_beer_bottle') * adults,
      ),
    })
  }
  if (lifestyle.winePerMonth > 0) {
    items.push({
      label: `Wine, ${Math.round(lifestyle.winePerMonth)} bottles/mo`,
      amount: Math.round(lifestyle.winePerMonth * cityPrice(city, 'wine_bottle_midrange')),
    })
  }
  if (beerOutPerMonth > 0) {
    items.push({
      label: `Beer out (${Math.round(beerOutPerMonth)}x/mo)`,
      amount: Math.round(
        beerOutPerMonth * cityPrice(city, 'domestic_beer_draught') * adults,
      ),
    })
  }

  return items
}

export function calculateMonthlyBudget(
  city: CityData,
  lifestyle: LifestyleInputs,
): BudgetBreakdown {
  const n = (key: keyof CityData, fallback = 0): number => cityPrice(city, key, fallback)

  const adults = lifestyle.includeSpouse ? 2 : 1

  const rent = n(RENT_FIELD[lifestyle.housing], n('rent_1br_outside_centre'))

  const groceryMultiplier = lifestyle.includeSpouse ? 1.6 : 1
  const baseGroceries = Object.entries(GROCERY_BASKET).reduce(
    (sum, [key, qty]) => sum + n(key as keyof CityData) * qty,
    0,
  )
  const groceries = baseGroceries * groceryMultiplier

  const casualMealsPerMonth = lifestyle.diningCasualPerWeek * WEEKS_PER_MONTH
  const coffeesPerMonth = lifestyle.coffeeShopPerWeek * WEEKS_PER_MONTH
  const dining =
    casualMealsPerMonth * n('meal_inexpensive_restaurant') * adults +
    coffeesPerMonth * n('cappuccino') * adults +
    (lifestyle.diningCasualPerWeek > 0 ? 2 * n('mcmeal') * adults : 0) +
    lifestyle.diningNicePerMonth * n('meal_midrange_restaurant_for2')

  const alcohol =
    lifestyle.beerHomePerWeek * WEEKS_PER_MONTH * n('domestic_beer_bottle') * adults +
    lifestyle.beerOutPerWeek * WEEKS_PER_MONTH * n('domestic_beer_draught') * adults +
    lifestyle.winePerMonth * n('wine_bottle_midrange')

  const passPrice = n('transport_monthly_pass')
  const passCost =
    passPrice > 0
      ? passPrice
      : n('transport_one_way_ticket') * TRANSPORT_PASS_FALLBACK_RIDES_PER_MONTH
  const transport =
    passCost * adults +
    lifestyle.taxiRidesPerMonth * (n('taxi_start') + 5 * n('taxi_per_km'))

  const utilities = n('utilities_monthly_85m2') + n('internet_60mbps_monthly')
  const mobile = lifestyle.includeMobile
    ? n('mobile_plan_monthly_usd', MOBILE_PLAN_FALLBACK_USD) * adults
    : 0

  const leisure =
    (lifestyle.gym ? n('gym_monthly') * adults : 0) +
    lifestyle.cinemaPerMonth * n('cinema_ticket') * adults

  const annualClothingCost = Object.entries(CLOTHING_BASKET).reduce(
    (sum, [key, qty]) => sum + n(key as keyof CityData) * qty,
    0,
  )
  const clothing = lifestyle.includeClothing
    ? (annualClothingCost / 12) * lifestyle.clothingMultiplier * adults
    : 0

  const healthInsurance = lifestyle.healthInsuranceMonthlyUsd * adults

  const coreSubtotal =
    rent + groceries + dining + alcohol + transport + utilities + mobile + leisure
  const incidentals = lifestyle.includeIncidentals
    ? coreSubtotal * lifestyle.incidentalsPct
    : 0

  const total = Math.round(coreSubtotal + clothing + incidentals + healthInsurance)

  return {
    rent: Math.round(rent),
    groceries: Math.round(groceries),
    dining: Math.round(dining),
    alcohol: Math.round(alcohol),
    transport: Math.round(transport),
    utilities: Math.round(utilities),
    mobile: Math.round(mobile),
    leisure: Math.round(leisure),
    clothing: Math.round(clothing),
    incidentals: Math.round(incidentals),
    healthInsurance: Math.round(healthInsurance),
    total,
  }
}

export function lifestylesEqual(a: LifestyleInputs, b: LifestyleInputs): boolean {
  return (Object.keys(a) as (keyof LifestyleInputs)[]).every((key) => a[key] === b[key])
}

export const BUDGET_BAR_CATEGORY_KEYS = [
  'rent',
  'groceries',
  'diningAndDrinks',
  'utilities',
  'transport',
  'lifestyle',
  'other',
] as const

export type BudgetBarCategoryKey = (typeof BUDGET_BAR_CATEGORY_KEYS)[number]

export type BudgetBarPercents = Record<BudgetBarCategoryKey, number> & {
  /** Rounding gap when category % sum to less than 100 (typically 0–3%). */
  remaining: number
}

export type BudgetBreakdownDisplay = {
  total: number
  breakdown: BudgetBreakdown
  barPercents: BudgetBarPercents
}

function budgetBarAmounts(breakdown: BudgetBreakdown): Record<BudgetBarCategoryKey, number> {
  return {
    rent: breakdown.rent,
    groceries: breakdown.groceries,
    diningAndDrinks: breakdown.dining + breakdown.alcohol,
    utilities: breakdown.utilities,
    transport: breakdown.transport,
    lifestyle: breakdown.leisure + breakdown.mobile + breakdown.clothing,
    other: breakdown.healthInsurance + breakdown.incidentals,
  }
}

/** Bar + legend: each category % = round(value / total × 100); remaining absorbs under-100 rounding only. */
export function buildBudgetBarPercents(
  breakdown: BudgetBreakdown,
  total: number,
): BudgetBarPercents {
  const amounts = budgetBarAmounts(breakdown)
  if (total <= 0) {
    return {
      rent: 0,
      groceries: 0,
      diningAndDrinks: 0,
      utilities: 0,
      transport: 0,
      lifestyle: 0,
      other: 0,
      remaining: 0,
    }
  }

  const entries = BUDGET_BAR_CATEGORY_KEYS.map((key) => ({
    key,
    amount: amounts[key],
    pct: Math.round((amounts[key] / total) * 100),
  }))

  let sumPct = entries.reduce((sum, entry) => sum + entry.pct, 0)
  let remaining = Math.max(0, 100 - sumPct)

  if (sumPct > 100) {
    const excess = sumPct - 100
    const largest = entries.reduce((best, entry) => (entry.amount > best.amount ? entry : best))
    largest.pct -= excess
    sumPct -= excess
    remaining = 0
  }

  const barPercents = {} as BudgetBarPercents
  for (const entry of entries) {
    barPercents[entry.key] = entry.pct
  }
  barPercents.remaining = remaining
  return barPercents
}

export function buildBudgetBreakdownDisplay(
  city: CityData,
  lifestyle: LifestyleInputs = DEFAULT_LIFESTYLE,
): BudgetBreakdownDisplay {
  const breakdown = calculateMonthlyBudget(city, lifestyle)

  return {
    total: breakdown.total,
    breakdown,
    barPercents: buildBudgetBarPercents(breakdown, breakdown.total),
  }
}

export function calculateAffordabilityScore(city: CityData, monthlyIncome: number): number {
  const budget = calculateMonthlyBudget(city, DEFAULT_LIFESTYLE).total
  if (budget <= 0 || monthlyIncome <= 0) return 0
  return Math.min(100, Math.round((monthlyIncome / budget) * 60))
}

export function formatUsd(n: number): string {
  return formatMoney(n)
}

export function formatUsdOrDash(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—'
  return formatUsd(n)
}

export function countryToFlagEmoji(country: string): string {
  const iso = countryToIsoCode(country)
  if (!iso || iso.length !== 2) return '🌍'
  const codePoints = [...iso.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export function countryToIsoCode(country: string): string | null {
  return COUNTRY_ISO[country] ?? null
}

export function countryToCurrencyCode(country: string): string | null {
  const iso = countryToIsoCode(country)
  if (!iso) return null
  return ISO_TO_CURRENCY[iso] ?? null
}

const ISO_TO_CURRENCY: Record<string, string> = {
  AE: 'AED',
  AL: 'ALL',
  AM: 'AMD',
  AR: 'ARS',
  AT: 'EUR',
  AU: 'AUD',
  AZ: 'AZN',
  BA: 'BAM',
  BD: 'BDT',
  BE: 'EUR',
  BG: 'BGN',
  BH: 'BHD',
  BO: 'BOB',
  BR: 'BRL',
  BW: 'BWP',
  BY: 'BYN',
  CA: 'CAD',
  CH: 'CHF',
  CI: 'XOF',
  CL: 'CLP',
  CM: 'XAF',
  CN: 'CNY',
  CO: 'COP',
  CR: 'CRC',
  CU: 'CUP',
  CY: 'EUR',
  CZ: 'CZK',
  DE: 'EUR',
  DK: 'DKK',
  DO: 'DOP',
  DZ: 'DZD',
  EC: 'USD',
  EE: 'EUR',
  EG: 'EGP',
  ES: 'EUR',
  ET: 'ETB',
  FI: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  GE: 'GEL',
  GH: 'GHS',
  GR: 'EUR',
  GT: 'GTQ',
  HK: 'HKD',
  HN: 'HNL',
  HR: 'EUR',
  HU: 'HUF',
  ID: 'IDR',
  IE: 'EUR',
  IL: 'ILS',
  IN: 'INR',
  IQ: 'IQD',
  IR: 'IRR',
  IS: 'ISK',
  IT: 'EUR',
  JM: 'JMD',
  JO: 'JOD',
  JP: 'JPY',
  KE: 'KES',
  KH: 'KHR',
  KR: 'KRW',
  KW: 'KWD',
  KZ: 'KZT',
  LA: 'LAK',
  LB: 'LBP',
  LK: 'LKR',
  LT: 'EUR',
  LU: 'EUR',
  LV: 'EUR',
  MA: 'MAD',
  MD: 'MDL',
  ME: 'EUR',
  MK: 'MKD',
  MM: 'MMK',
  MN: 'MNT',
  MT: 'EUR',
  MU: 'MUR',
  MX: 'MXN',
  MY: 'MYR',
  MZ: 'MZN',
  NA: 'NAD',
  NG: 'NGN',
  NI: 'NIO',
  NL: 'EUR',
  NO: 'NOK',
  NP: 'NPR',
  NZ: 'NZD',
  OM: 'OMR',
  PA: 'USD',
  PE: 'PEN',
  PH: 'PHP',
  PK: 'PKR',
  PL: 'PLN',
  PR: 'USD',
  PT: 'EUR',
  PY: 'PYG',
  QA: 'QAR',
  RO: 'RON',
  RS: 'RSD',
  RU: 'RUB',
  SA: 'SAR',
  SE: 'SEK',
  SG: 'SGD',
  SI: 'EUR',
  SK: 'EUR',
  SN: 'XOF',
  SV: 'USD',
  SY: 'SYP',
  TH: 'THB',
  TN: 'TND',
  TR: 'TRY',
  TT: 'TTD',
  TW: 'TWD',
  TZ: 'TZS',
  UA: 'UAH',
  UG: 'UGX',
  US: 'USD',
  UY: 'UYU',
  UZ: 'UZS',
  VE: 'VES',
  VN: 'VND',
  XK: 'EUR',
  ZA: 'ZAR',
  ZM: 'ZMW',
  ZW: 'ZWG',
}

const COUNTRY_ISO: Record<string, string> = {
  'South Korea': 'KR',
  'United States': 'US',
  'United Kingdom': 'GB',
  'Czech Republic': 'CZ',
  'Dominican Republic': 'DO',
  'Costa Rica': 'CR',
  'New Zealand': 'NZ',
  'South Africa': 'ZA',
  'United Arab Emirates': 'AE',
  'Hong Kong': 'HK',
  Taiwan: 'TW',
  Russia: 'RU',
  Vietnam: 'VN',
  Turkey: 'TR',
  Iran: 'IR',
  Syria: 'SY',
  'North Macedonia': 'MK',
  'Bosnia And Herzegovina': 'BA',
  'Trinidad And Tobago': 'TT',
  'Sri Lanka': 'LK',
  'Puerto Rico': 'PR',
  "Côte d'Ivoire": 'CI',
  'El Salvador': 'SV',
  'Saudi Arabia': 'SA',
  China: 'CN',
  India: 'IN',
  Brazil: 'BR',
  Canada: 'CA',
  Mexico: 'MX',
  Japan: 'JP',
  Germany: 'DE',
  France: 'FR',
  Italy: 'IT',
  Spain: 'ES',
  Portugal: 'PT',
  Netherlands: 'NL',
  Belgium: 'BE',
  Switzerland: 'CH',
  Austria: 'AT',
  Poland: 'PL',
  Sweden: 'SE',
  Norway: 'NO',
  Denmark: 'DK',
  Finland: 'FI',
  Ireland: 'IE',
  Greece: 'GR',
  Hungary: 'HU',
  Romania: 'RO',
  Bulgaria: 'BG',
  Croatia: 'HR',
  Serbia: 'RS',
  Ukraine: 'UA',
  Israel: 'IL',
  Egypt: 'EG',
  Morocco: 'MA',
  Tunisia: 'TN',
  Algeria: 'DZ',
  Kenya: 'KE',
  Nigeria: 'NG',
  Ghana: 'GH',
  Ethiopia: 'ET',
  Tanzania: 'TZ',
  Uganda: 'UG',
  Zimbabwe: 'ZW',
  Zambia: 'ZM',
  Mozambique: 'MZ',
  Namibia: 'NA',
  Botswana: 'BW',
  Mauritius: 'MU',
  Australia: 'AU',
  Indonesia: 'ID',
  Thailand: 'TH',
  Malaysia: 'MY',
  Singapore: 'SG',
  Philippines: 'PH',
  Pakistan: 'PK',
  Bangladesh: 'BD',
  Nepal: 'NP',
  Cambodia: 'KH',
  Laos: 'LA',
  Myanmar: 'MM',
  Mongolia: 'MN',
  Kazakhstan: 'KZ',
  Uzbekistan: 'UZ',
  Azerbaijan: 'AZ',
  Georgia: 'GE',
  Armenia: 'AM',
  Qatar: 'QA',
  Kuwait: 'KW',
  Bahrain: 'BH',
  Oman: 'OM',
  Jordan: 'JO',
  Lebanon: 'LB',
  Iraq: 'IQ',
  Colombia: 'CO',
  Argentina: 'AR',
  Chile: 'CL',
  Peru: 'PE',
  Ecuador: 'EC',
  Bolivia: 'BO',
  Paraguay: 'PY',
  Uruguay: 'UY',
  Venezuela: 'VE',
  Panama: 'PA',
  Guatemala: 'GT',
  Honduras: 'HN',
  Nicaragua: 'NI',
  Cuba: 'CU',
  Jamaica: 'JM',
  Iceland: 'IS',
  Luxembourg: 'LU',
  Slovakia: 'SK',
  Slovenia: 'SI',
  Lithuania: 'LT',
  Latvia: 'LV',
  Estonia: 'EE',
  Moldova: 'MD',
  Belarus: 'BY',
  Cyprus: 'CY',
  Malta: 'MT',
  Albania: 'AL',
  Montenegro: 'ME',
  Kosovo: 'XK',
  Cameroon: 'CM',
  Senegal: 'SN',
  'Ivory Coast': 'CI',
}
