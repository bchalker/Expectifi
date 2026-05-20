import { CURATED_RETIREMENT_DESTINATIONS } from '../../data/curatedRetirementDestinations'
import { getHealthcareRating } from '../../data/destinationHealthcare'
import { getCountryTaxEntry } from '../../data/countryTaxRates'
import { getTeleportFallback } from '../../data/teleportFallbacks'
import { readApiCache } from '../api/apiCache'
import type { DollarStrengthSeries } from '../api/exchangeRates'
import type { CityClimate } from '../api/openMeteo'
import {
  countryToIsoCode,
  formatUsd,
  formatUsdOrDash,
  type MapCity,
} from '../../utils/costOfLiving'
import { formatGasolineDualPrice } from '../../utils/units'
import type { ScoredMapCity } from './cityMapScoring'
import {
  getDemographicsRowNumericValue,
  getDemographicsRowValue,
  getDemographicsData,
  type DemographicsCountryData,
} from '../../utils/demographics'
import {
  getQoLRowNumericValue,
  getQoLRowValue,
  getQualityOfLifeData,
  type QualityOfLifeCountryData,
} from '../../utils/qualityOfLife'
import { getTaxVisaData, getTaxVisaRowValue, type TaxVisaCountryData } from '../../utils/taxVisa'
import { getCountryTaxForCityCountry } from './countryTaxForCity'

export type ComparisonRowKind = 'section' | 'data'

export type ComparisonRowDef = {
  id: string
  kind: ComparisonRowKind
  label: string
  sublabel?: string
  /** Lower numeric value wins green highlight (cost rows). */
  highlight?: 'lower-green' | 'higher-green' | 'none'
  format?: 'money' | 'text' | 'percent-of-salary'
}

export type ComparisonColumnData = {
  key: string
  city: MapCity
  scored: ScoredMapCity
  afterTaxMonthly: number
  surplus: number
  topReason: string
  colIndex: number | null
  taxVisa: TaxVisaCountryData | null
  qualityOfLife: QualityOfLifeCountryData | null
  demographics: DemographicsCountryData | null
  practical: {
    english: number
    healthcare: number
    visa: number
  }
  climate: CityClimate | null
  dollarStrength: DollarStrengthSeries | null
  currencyCode: string | null
  currencyName: string | null
  exchangeRateLabel: string | null
}

const ENGLISH_SPEAKING = new Set([
  'United Kingdom',
  'Ireland',
  'Australia',
  'New Zealand',
  'Canada',
  'Costa Rica',
])

function teleportSlugForCountry(country: string): string {
  const iso = countryToIsoCode(country)
  if (!iso) return ''
  return getCountryTaxEntry(iso)?.teleportSlug ?? ''
}

function colIndexForCountry(country: string): number | null {
  const slug = teleportSlugForCountry(country)
  if (!slug) return null
  const fb = getTeleportFallback(slug)
  return Math.round(fb.col * 10)
}

function curatedGaugesForCountry(country: string) {
  const iso = countryToIsoCode(country)
  if (!iso) return null
  const matches = CURATED_RETIREMENT_DESTINATIONS.filter((d) => d.countryCode === iso)
  if (!matches.length) return null
  const d = matches[0]
  return d.gauges
}

function practicalScoresForCountry(country: string) {
  const gauges = curatedGaugesForCountry(country)
  if (gauges) {
    return {
      english: gauges.english.score,
      healthcare: gauges.healthcare.score,
      visa: gauges.visa.score,
    }
  }
  const key = countryToIsoCode(country)
  const catalogKey = key ? `country:${key}` : ''
  return {
    english: ENGLISH_SPEAKING.has(country) ? 82 : 48,
    healthcare: catalogKey ? getHealthcareRating(catalogKey) : 70,
    visa: 68,
  }
}

function afterTaxIncome(monthlyIncome: number, country: string): number {
  const entry = getCountryTaxForCityCountry(country)
  const rate = entry?.effectiveRetirementRate ?? 0
  return monthlyIncome * (1 - rate)
}

function topReasonForScored(scored: ScoredMapCity): string {
  return scored.colExplanation
}

export function buildComparisonColumnData(
  scored: ScoredMapCity,
  monthlyIncome: number,
  climate: CityClimate | null,
  dollarStrength: DollarStrengthSeries | null,
  currencyCode: string | null,
  currencyName: string | null,
  exchangeRateLabel: string | null,
): ComparisonColumnData {
  const { city } = scored
  const afterTax = afterTaxIncome(monthlyIncome, city.country)
  return {
    key: city.id,
    city,
    scored,
    afterTaxMonthly: afterTax,
    surplus: afterTax - scored.monthlyBudget,
    topReason: topReasonForScored(scored),
    colIndex: colIndexForCountry(city.country),
    taxVisa: getTaxVisaData(city.country),
    qualityOfLife: getQualityOfLifeData(city.country),
    demographics: getDemographicsData(city.country),
    practical: practicalScoresForCountry(city.country),
    climate,
    dollarStrength,
    currencyCode,
    currencyName,
    exchangeRateLabel,
  }
}

export function loadDollarStrengthForCountry(country: string): DollarStrengthSeries | null {
  const iso = countryToIsoCode(country)
  if (!iso) return null
  const entry = getCountryTaxEntry(iso)
  if (!entry || entry.currencyCode === 'USD') return null
  return (
    readApiCache<DollarStrengthSeries>(
      'exchangerate',
      `usd-v2-${entry.currencyCode.toUpperCase()}`,
    ) ?? null
  )
}

export const COMPARISON_TABLE_ROWS: ComparisonRowDef[] = [
  { id: 'sec-summary', kind: 'section', label: 'Summary' },
  { id: 'monthlyBudget', kind: 'data', label: 'Estimated monthly budget', highlight: 'lower-green', format: 'money' },
  { id: 'surplus', kind: 'data', label: 'Monthly surplus / shortfall vs projected income', highlight: 'higher-green', format: 'money' },
  { id: 'afterTax', kind: 'data', label: 'After-tax monthly income', highlight: 'higher-green', format: 'money' },
  { id: 'topReason', kind: 'data', label: 'Top reason this destination ranked', highlight: 'none' },
  { id: 'sec-rent', kind: 'section', label: 'Rent' },
  { id: 'rent1brOutside', kind: 'data', label: '1BR outside city center (monthly)', highlight: 'lower-green', format: 'money' },
  { id: 'rent1brCenter', kind: 'data', label: '1BR city center (monthly)', highlight: 'lower-green', format: 'money' },
  { id: 'rent3brOutside', kind: 'data', label: '3BR outside city center (monthly)', highlight: 'lower-green', format: 'money' },
  { id: 'sec-food', kind: 'section', label: 'Food & Drink' },
  { id: 'foodMonthly', kind: 'data', label: 'Monthly food estimate (45 meals)', highlight: 'lower-green', format: 'money' },
  { id: 'mealInexpensive', kind: 'data', label: 'Inexpensive restaurant meal', highlight: 'lower-green', format: 'money' },
  { id: 'mcmeal', kind: 'data', label: "McMeal at McDonald's", highlight: 'lower-green', format: 'money' },
  { id: 'cappuccino', kind: 'data', label: 'Cappuccino', highlight: 'lower-green', format: 'money' },
  { id: 'beerDraft', kind: 'data', label: 'Domestic beer draft', highlight: 'lower-green', format: 'money' },
  { id: 'beerImported', kind: 'data', label: 'Imported beer bottle', highlight: 'lower-green', format: 'money' },
  { id: 'wine', kind: 'data', label: 'Wine mid-range bottle', highlight: 'lower-green', format: 'money' },
  { id: 'milk', kind: 'data', label: 'Milk 1L', highlight: 'lower-green', format: 'money' },
  { id: 'bread', kind: 'data', label: 'Bread 500g', highlight: 'lower-green', format: 'money' },
  { id: 'eggs', kind: 'data', label: 'Eggs 12', highlight: 'lower-green', format: 'money' },
  { id: 'chicken', kind: 'data', label: 'Chicken 1kg', highlight: 'lower-green', format: 'money' },
  { id: 'sec-transport', kind: 'section', label: 'Transport' },
  { id: 'transitPass', kind: 'data', label: 'Monthly transit pass', highlight: 'lower-green', format: 'money' },
  { id: 'gasoline', kind: 'data', label: 'Gasoline per gallon / per liter', highlight: 'lower-green' },
  { id: 'sec-utilities', kind: 'section', label: 'Utilities & Services' },
  { id: 'utilities', kind: 'data', label: 'Utilities monthly 85m²', highlight: 'lower-green', format: 'money' },
  { id: 'internet', kind: 'data', label: 'Internet 60Mbps monthly', highlight: 'lower-green', format: 'money' },
  { id: 'mobileTariff', kind: 'data', label: 'Mobile tariff per minute', highlight: 'lower-green', format: 'money' },
  { id: 'sec-leisure', kind: 'section', label: 'Leisure' },
  { id: 'gym', kind: 'data', label: 'Gym membership monthly', highlight: 'lower-green', format: 'money' },
  { id: 'dinner2', kind: 'data', label: 'Mid-range dinner for 2', highlight: 'lower-green', format: 'money' },
  { id: 'cinema', kind: 'data', label: 'Cinema ticket', highlight: 'lower-green', format: 'money' },
  { id: 'tennis', kind: 'data', label: 'Tennis court 1hr', highlight: 'lower-green', format: 'money' },
  { id: 'sec-economy', kind: 'section', label: 'Local Economy' },
  { id: 'avgSalary', kind: 'data', label: 'Average monthly net salary', highlight: 'higher-green', format: 'money' },
  { id: 'incomeVsLocals', kind: 'data', label: 'Your income vs locals (% of avg salary)', highlight: 'higher-green', format: 'percent-of-salary' },
  { id: 'localCurrency', kind: 'data', label: 'Local currency', highlight: 'none' },
  { id: 'exchangeRate', kind: 'data', label: 'Exchange rate vs USD', highlight: 'none' },
  { id: 'colIndex', kind: 'data', label: 'Cost of living index score', highlight: 'higher-green' },
  { id: 'dollarStrength', kind: 'data', label: 'Dollar vs local currency strength', highlight: 'none' },
  { id: 'sec-climate', kind: 'section', label: 'Climate' },
  { id: 'climateType', kind: 'data', label: 'Climate type label', highlight: 'none' },
  { id: 'climateTemps', kind: 'data', label: 'Average monthly temperatures Jan-Dec', highlight: 'none' },
  { id: 'sec-tax', kind: 'section', label: 'Tax & Visa' },
  {
    id: 'taxRate',
    kind: 'data',
    label: 'Tax rate on retirement income',
    sublabel: 'US federal tax applies on worldwide income for US citizens',
    highlight: 'none',
  },
  { id: 'exemptions', kind: 'data', label: 'Key retirement income exemptions', highlight: 'none' },
  { id: 'visa', kind: 'data', label: 'Visa / residency requirement', highlight: 'none' },
  { id: 'healthcare', kind: 'data', label: 'Healthcare notes for US expats', highlight: 'none' },
  { id: 'sec-qol', kind: 'section', label: 'Quality of Life' },
  { id: 'qolOverall', kind: 'data', label: 'Overall QoL score', highlight: 'higher-green' },
  { id: 'qolSafety', kind: 'data', label: 'Safety index', highlight: 'higher-green' },
  { id: 'qolHealthcare', kind: 'data', label: 'Healthcare index', highlight: 'higher-green' },
  { id: 'qolClimate', kind: 'data', label: 'Climate index', highlight: 'higher-green' },
  {
    id: 'qolPollution',
    kind: 'data',
    label: 'Air quality — lower is better',
    highlight: 'lower-green',
  },
  { id: 'qolPurchasingPower', kind: 'data', label: 'Purchasing power index', highlight: 'higher-green' },
  { id: 'sec-people-culture', kind: 'section', label: 'People & Culture' },
  { id: 'demoDominantReligion', kind: 'data', label: 'Dominant religion', highlight: 'none' },
  { id: 'demoChristianPct', kind: 'data', label: 'Christian %', highlight: 'higher-green' },
  { id: 'demoMuslimPct', kind: 'data', label: 'Muslim %', highlight: 'none' },
  { id: 'demoUnaffiliatedPct', kind: 'data', label: 'Unaffiliated %', highlight: 'none' },
  { id: 'demoEnglish', kind: 'data', label: 'English proficiency', highlight: 'higher-green' },
  { id: 'demoMedianAge', kind: 'data', label: 'Median age', highlight: 'none' },
  { id: 'demoUrbanPct', kind: 'data', label: 'Urban population %', highlight: 'none' },
  { id: 'demoExpatCommunity', kind: 'data', label: 'Expat community size', highlight: 'none' },
  { id: 'sec-practical', kind: 'section', label: 'Practical' },
  { id: 'english', kind: 'data', label: 'English friendliness rating', highlight: 'higher-green' },
  { id: 'healthcareScore', kind: 'data', label: 'Healthcare quality score', highlight: 'higher-green' },
  { id: 'visaEase', kind: 'data', label: 'Visa & residency ease rating', highlight: 'higher-green' },
]

function monthlyFood(city: MapCity): number {
  return Math.round(city.meal_inexpensive_restaurant * 45)
}

function formatClimateTemps(climate: CityClimate | null): string {
  if (!climate?.monthly.length) return '—'
  return climate.monthly
    .map((m) => `${m.monthLabel} ${Math.round((m.avgHighC + m.avgLowC) / 2)}°C`)
    .join(' · ')
}

export function getComparisonCellNumericValue(
  rowId: string,
  col: ComparisonColumnData,
  monthlyIncome: number,
): number | null {
  const { city, scored } = col
  switch (rowId) {
    case 'monthlyBudget':
      return scored.monthlyBudget
    case 'surplus':
      return col.surplus
    case 'afterTax':
      return col.afterTaxMonthly
    case 'rent1brOutside':
      return city.rent_1br_outside_centre || null
    case 'rent1brCenter':
      return city.rent_1br_city_centre || null
    case 'rent3brOutside':
      return city.rent_3br_outside_centre || null
    case 'foodMonthly':
      return monthlyFood(city)
    case 'mealInexpensive':
      return city.meal_inexpensive_restaurant || null
    case 'mcmeal':
      return city.mcmeal || null
    case 'cappuccino':
      return city.cappuccino || null
    case 'beerDraft':
      return city.domestic_beer_draught || null
    case 'beerImported':
      return city.imported_beer_bottle || null
    case 'wine':
      return city.wine_bottle_midrange || null
    case 'milk':
      return city.milk_1L || null
    case 'bread':
      return city.bread_500g || null
    case 'eggs':
      return city.eggs_12 || null
    case 'chicken':
      return city.chicken_1kg || null
    case 'transitPass':
      return city.transport_monthly_pass || null
    case 'gasoline':
      return city.gasoline_1L || null
    case 'utilities':
      return city.utilities_monthly_85m2 || null
    case 'internet':
      return city.internet_60mbps_monthly || null
    case 'mobileTariff':
      return city.mobile_tariff_per_min || null
    case 'gym':
      return city.gym_monthly || null
    case 'dinner2':
      return city.meal_midrange_restaurant_for2 || null
    case 'cinema':
      return city.cinema_ticket || null
    case 'tennis':
      return city.tennis_court_1hr || null
    case 'avgSalary':
      return city.avg_monthly_net_salary || null
    case 'incomeVsLocals':
      return city.avg_monthly_net_salary > 0
        ? (monthlyIncome / city.avg_monthly_net_salary) * 100
        : null
    case 'colIndex':
      return col.colIndex
    case 'english':
      return col.practical.english
    case 'healthcareScore':
      return col.practical.healthcare
    case 'visaEase':
      return col.practical.visa
    case 'qolOverall':
    case 'qolSafety':
    case 'qolHealthcare':
    case 'qolClimate':
    case 'qolPollution':
    case 'qolPurchasingPower':
      return getQoLRowNumericValue(col.qualityOfLife, rowId)
    case 'demoChristianPct':
    case 'demoMuslimPct':
    case 'demoUnaffiliatedPct':
    case 'demoMedianAge':
    case 'demoUrbanPct':
    case 'demoEnglish':
      return getDemographicsRowNumericValue(col.demographics, rowId)
    default:
      return null
  }
}

export function isComparisonEnglishBadgeRow(rowId: string): boolean {
  return rowId === 'demoEnglish'
}

export function getComparisonCellDisplay(
  rowId: string,
  col: ComparisonColumnData,
  monthlyIncome: number,
): string {
  const { city } = col
  switch (rowId) {
    case 'monthlyBudget':
      return formatUsd(col.scored.monthlyBudget)
    case 'surplus': {
      const s = col.surplus
      const prefix = s >= 0 ? '+' : ''
      return `${prefix}${formatUsd(Math.abs(s))}`
    }
    case 'afterTax':
      return formatUsd(col.afterTaxMonthly)
    case 'topReason':
      return col.topReason
    case 'rent1brOutside':
      return formatUsdOrDash(city.rent_1br_outside_centre)
    case 'rent1brCenter':
      return formatUsdOrDash(city.rent_1br_city_centre)
    case 'rent3brOutside':
      return formatUsdOrDash(city.rent_3br_outside_centre)
    case 'foodMonthly':
      return formatUsdOrDash(monthlyFood(city))
    case 'mealInexpensive':
      return formatUsdOrDash(city.meal_inexpensive_restaurant)
    case 'mcmeal':
      return formatUsdOrDash(city.mcmeal)
    case 'cappuccino':
      return formatUsdOrDash(city.cappuccino)
    case 'beerDraft':
      return formatUsdOrDash(city.domestic_beer_draught)
    case 'beerImported':
      return formatUsdOrDash(city.imported_beer_bottle)
    case 'wine':
      return formatUsdOrDash(city.wine_bottle_midrange)
    case 'milk':
      return formatUsdOrDash(city.milk_1L)
    case 'bread':
      return formatUsdOrDash(city.bread_500g)
    case 'eggs':
      return formatUsdOrDash(city.eggs_12)
    case 'chicken':
      return formatUsdOrDash(city.chicken_1kg)
    case 'transitPass':
      return formatUsdOrDash(city.transport_monthly_pass)
    case 'gasoline':
      return formatGasolineDualPrice(city.gasoline_1L)
    case 'utilities':
      return formatUsdOrDash(city.utilities_monthly_85m2)
    case 'internet':
      return formatUsdOrDash(city.internet_60mbps_monthly)
    case 'mobileTariff':
      return formatUsdOrDash(city.mobile_tariff_per_min)
    case 'gym':
      return formatUsdOrDash(city.gym_monthly)
    case 'dinner2':
      return formatUsdOrDash(city.meal_midrange_restaurant_for2)
    case 'cinema':
      return formatUsdOrDash(city.cinema_ticket)
    case 'tennis':
      return formatUsdOrDash(city.tennis_court_1hr)
    case 'avgSalary':
      return formatUsdOrDash(city.avg_monthly_net_salary)
    case 'incomeVsLocals':
      return city.avg_monthly_net_salary > 0
        ? `${Math.round((monthlyIncome / city.avg_monthly_net_salary) * 100)}%`
        : '—'
    case 'localCurrency':
      return col.currencyName && col.currencyCode
        ? `${col.currencyName} (${col.currencyCode})`
        : '—'
    case 'exchangeRate':
      return col.exchangeRateLabel ?? '—'
    case 'colIndex':
      return col.colIndex != null ? `${col.colIndex}` : '—'
    case 'dollarStrength':
      if (!col.dollarStrength) return col.currencyCode === 'USD' ? 'Uses USD' : '—'
      return col.dollarStrength.trendPct >= 0
        ? `USD strengthening (+${col.dollarStrength.trendPct.toFixed(1)}%)`
        : `USD weakening (${col.dollarStrength.trendPct.toFixed(1)}%)`
    case 'climateType':
      return col.climate?.climateLabel ?? '—'
    case 'climateTemps':
      return formatClimateTemps(col.climate)
    case 'taxRate':
      return getTaxVisaRowValue(col.taxVisa, 'taxRate')
    case 'exemptions':
      return getTaxVisaRowValue(col.taxVisa, 'exemptions')
    case 'visa':
      return getTaxVisaRowValue(col.taxVisa, 'visa')
    case 'healthcare':
      return getTaxVisaRowValue(col.taxVisa, 'healthcare')
    case 'qolOverall':
    case 'qolSafety':
    case 'qolHealthcare':
    case 'qolClimate':
    case 'qolPollution':
    case 'qolPurchasingPower':
      return getQoLRowValue(col.qualityOfLife, rowId)
    case 'demoDominantReligion':
    case 'demoChristianPct':
    case 'demoMuslimPct':
    case 'demoUnaffiliatedPct':
    case 'demoEnglish':
    case 'demoMedianAge':
    case 'demoUrbanPct':
    case 'demoExpatCommunity':
      return getDemographicsRowValue(col.demographics, rowId)
    case 'english':
      return `${col.practical.english} / 100`
    case 'healthcareScore':
      return `${col.practical.healthcare} / 100`
    case 'visaEase':
      return `${col.practical.visa} / 100`
    default:
      return '—'
  }
}

export function getComparisonHighlightClass(
  row: ComparisonRowDef,
  colKey: string,
  columns: ComparisonColumnData[],
  monthlyIncome: number,
): string | null {
  if (row.kind !== 'data' || !row.highlight || row.highlight === 'none') return null
  const values = columns
    .map((c) => ({
      key: c.key,
      n: getComparisonCellNumericValue(row.id, c, monthlyIncome),
    }))
    .filter((v): v is { key: string; n: number } => {
      if (v.n == null) return false
      if (row.id.startsWith('qol') || row.id.startsWith('demo')) return true
      return v.n > 0
    })

  if (values.length < 2) return null

  const nums = values.map((v) => v.n)
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  if (min === max) return null

  const val = values.find((v) => v.key === colKey)?.n
  if (val == null) return null

  if (row.highlight === 'lower-green') {
    if (val === min) return 'wtr-compare-table__cell--lowest'
    if (val === max) return 'wtr-compare-table__cell--highest'
  } else {
    if (val === max) return 'wtr-compare-table__cell--lowest'
    if (val === min) return 'wtr-compare-table__cell--highest'
  }
  return null
}
