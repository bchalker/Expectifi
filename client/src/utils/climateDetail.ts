import type { CityClimate, MonthlyClimate } from '../lib/api/openMeteo'
import {
  CLIMATE_COMFORT_TEMP_MAX_C,
  CLIMATE_COMFORT_TEMP_MIN_C,
} from './climateComfortScore'
import { classifyClimateType, type ClimateNotesCategory } from './climateNotes'

const CATEGORY_LABELS: Record<ClimateNotesCategory, string> = {
  tropical_humid: 'Tropical humid',
  subtropical_humid: 'Subtropical humid',
  mediterranean: 'Mediterranean',
  subtropical_dry: 'Subtropical dry',
  mild_temperate: 'Mild temperate',
  continental: 'Continental',
  subarctic: 'Subarctic / harsh',
}

export type ClimateTagTone = 'humidity' | 'heat' | 'cold' | 'rain' | 'dry' | 'seasonal'

export type ClimateTag = {
  label: string
  tone: ClimateTagTone
}

export type SeasonKey = 'winter' | 'spring' | 'summer' | 'fall'

export type SeasonTagTone = 'success' | 'warning' | 'danger' | 'info' | 'muted'

export type SeasonCard = {
  season: SeasonKey
  seasonLabel: string
  tempLowC: number
  tempHighC: number
  description: string
  tagLabel: string
  tagTone: SeasonTagTone
}

export type ClimateConsiderationTone = 'muted' | 'info' | 'warning' | 'danger'

export type ClimateConsideration = {
  id: string
  title: string
  description: string
  tone: ClimateConsiderationTone
  emphasized: boolean
}

export type ClimateDetailMetrics = {
  avgHighC: number
  avgHumidityPct: number | null
  humidityLabel: string | null
  rainyMonthCount: number
  rainyMonthRange: string | null
}

export type ClimateDetailView = {
  category: ClimateNotesCategory | null
  categoryLabel: string
  tags: ClimateTag[]
  description: string
  retireeNote: string
  metrics: ClimateDetailMetrics
  seasons: SeasonCard[]
  considerations: ClimateConsideration[]
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const NH_SEASON_MONTHS: Record<SeasonKey, number[]> = {
  winter: [12, 1, 2],
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  fall: [9, 10, 11],
}

const SH_SEASON_MONTHS: Record<SeasonKey, number[]> = {
  winter: [6, 7, 8],
  spring: [9, 10, 11],
  summer: [12, 1, 2],
  fall: [3, 4, 5],
}

const SEASON_LABELS: Record<SeasonKey, string> = {
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
}

const CATEGORY_DESCRIPTIONS: Record<
  ClimateNotesCategory,
  (climate: CityClimate, humidity: number | null) => string
> = {
  tropical_humid: (climate, humidity) => {
    const hum = humidity ?? climate.annualAvgHumidityPct
    const humText = hum != null ? ` Humidity averages ${Math.round(hum)}%.` : ''
    return `Hot and humid year-round with a distinct rainy season.${humText} Expect sticky air most days and plan around wet months.`
  },
  subtropical_humid: (_climate, humidity) => {
    const humText =
      humidity != null ? ` Humidity often runs ${Math.round(humidity)}% in peak months.` : ''
    return `Warm summers with noticeable humidity and milder shoulder seasons.${humText} Spring and fall are usually the most comfortable windows.`
  },
  mediterranean: () =>
    'Dry summers, mild winters, and plenty of sunshine. Most retirees find outdoor life easy for much of the year.',
  subtropical_dry: () =>
    'Warm and relatively dry — strong sun with less sticky air than humid tropics. Evenings often cool enough for outdoor dining.',
  mild_temperate: () =>
    'Cool-to-moderate year-round with clear seasonal change. Layers and a light jacket go a long way.',
  continental: () =>
    'Real winter cold and warm summers. Heating and cooling costs matter, and snow or ice can limit mobility.',
  subarctic: () =>
    'Long, harsh winters with a short growing season. Most retirees find the climate physically demanding.',
}

const RETIREE_NOTES: Record<ClimateNotesCategory, string> = {
  tropical_humid:
    'For retirees: Persistent humidity and heat can be physically draining, especially for those with respiratory or cardiovascular conditions. Many expats rely heavily on air conditioning and adjust their outdoor schedule to early mornings.',
  subtropical_humid:
    'For retirees: Summer humidity can aggravate arthritis and breathing issues. Plan errands and walks for cooler morning hours and keep indoor spaces dehumidified.',
  mediterranean:
    'For retirees: Generally comfortable for active outdoor living, though summer heat waves may require midday breaks. Mild winters suit most mobility levels.',
  subtropical_dry:
    'For retirees: Dry heat is easier on joints than humid air, but dehydration and sun exposure happen quickly. Shade, hydration, and sunscreen are daily habits.',
  mild_temperate:
    'For retirees: Moderate temperatures suit most activity levels, though damp cool days can feel sharper with age. Good footwear matters on wet pavement.',
  continental:
    'For retirees: Ice, snow, and summer heat spikes create real mobility and health risks. Factor heating, cooling, and seasonal travel into your plan.',
  subarctic:
    'For retirees: Extreme cold, limited daylight, and slippery conditions make this climate challenging for most older adults — medical access and winter safety are top concerns.',
}

function monthlyMeanTempC(month: MonthlyClimate): number {
  return (month.avgHighC + month.avgLowC) / 2
}

function annualAvgHumidityFromMonthly(monthly: MonthlyClimate[]): number | null {
  const values = monthly
    .map((month) => month.avgHumidityPct)
    .filter((value): value is number => value != null && Number.isFinite(value))
  if (!values.length) return null
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function resolveHumidity(climate: CityClimate): number | null {
  return climate.annualAvgHumidityPct ?? annualAvgHumidityFromMonthly(climate.monthly)
}

function humidityComfortLabel(humidity: number | null): string | null {
  if (humidity == null) return null
  if (humidity >= 85) return 'Oppressive'
  if (humidity >= 75) return 'Sticky'
  if (humidity >= 60) return 'Moderate'
  return 'Comfortable'
}

function seasonMonths(season: SeasonKey, lat: number): number[] {
  return lat < 0 ? SH_SEASON_MONTHS[season] : NH_SEASON_MONTHS[season]
}

function monthsForSeason(climate: CityClimate, season: SeasonKey, lat: number): MonthlyClimate[] {
  const allowed = new Set(seasonMonths(season, lat))
  return climate.monthly.filter((month) => allowed.has(month.month))
}

function formatMonthRange(monthNumbers: number[]): string | null {
  if (!monthNumbers.length) return null
  const sorted = [...monthNumbers].sort((a, b) => a - b)

  const groups: number[][] = []
  let group: number[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]
    const current = sorted[i]
    if (current === prev + 1 || (prev === 12 && current === 1)) {
      group.push(current)
    } else {
      groups.push(group)
      group = [current]
    }
  }
  groups.push(group)

  const wrapAround =
    groups.length >= 2 && groups[0][0] === 1 && groups[groups.length - 1].at(-1) === 12
  if (wrapAround) {
    const merged = [...groups[groups.length - 1], ...groups[0]]
    groups.splice(groups.length - 1, 1)
    groups[0] = merged.sort((a, b) => a - b)
  }

  const label = (month: number) => MONTH_LABELS[month - 1]

  return groups
    .map((months) => {
      if (months.length === 1) return label(months[0])
      return `${label(months[0])} – ${label(months[months.length - 1])}`
    })
    .join(', ')
}

function rainyMonths(climate: CityClimate): MonthlyClimate[] {
  const { monthly } = climate
  if (!monthly.length) return []
  const meanPrecip = monthly.reduce((sum, month) => sum + month.avgPrecipMm, 0) / monthly.length
  return monthly.filter((month) => month.avgPrecipMm >= meanPrecip * 1.15)
}

function seasonComfortScore(months: MonthlyClimate[]): number {
  if (!months.length) return 50

  let score = 100
  for (const month of months) {
    const mean = monthlyMeanTempC(month)
    if (mean < CLIMATE_COMFORT_TEMP_MIN_C) {
      score -= (CLIMATE_COMFORT_TEMP_MIN_C - mean) * 4
    } else if (mean > CLIMATE_COMFORT_TEMP_MAX_C) {
      score -= (mean - CLIMATE_COMFORT_TEMP_MAX_C) * 4
    }
    if (month.avgHumidityPct != null) {
      if (month.avgHumidityPct > 85) score -= 15
      else if (month.avgHumidityPct > 75) score -= 8
    }
    score -= Math.min(25, month.avgPrecipMm / 12)
  }

  return score / months.length
}

function describeSeason(
  season: SeasonKey,
  months: MonthlyClimate[],
  stats: {
    isBest: boolean
    isWorst: boolean
    isRainiest: boolean
    isDriest: boolean
    isWarmest: boolean
    isCoolest: boolean
  },
): string {
  const meanPrecip =
    months.reduce((sum, month) => sum + month.avgPrecipMm, 0) / Math.max(months.length, 1)
  const meanHumidityValues = months
    .map((month) => month.avgHumidityPct)
    .filter((value): value is number => value != null)
  const meanHumidity = meanHumidityValues.length
    ? meanHumidityValues.reduce((sum, value) => sum + value, 0) / meanHumidityValues.length
    : null

  if (stats.isBest && stats.isDriest) {
    return season === 'winter' ? 'Dry season, most bearable' : 'Mildest stretch of the year'
  }
  if (stats.isRainiest && meanHumidity != null && meanHumidity > 75) {
    return 'Rainy season, very humid'
  }
  if (stats.isRainiest) return 'Wettest months — plan indoor backups'
  if (stats.isWarmest && meanHumidity != null && meanHumidity > 70) {
    return 'Getting hot, humidity rises'
  }
  if (stats.isWarmest) return 'Warmest stretch — peak heat'
  if (stats.isCoolest) return 'Coolest months — best for layering'
  if (meanPrecip > 80 && season === 'fall') return 'Rains tapering off'
  if (season === 'spring') return 'Transition season — weather shifts quickly'
  if (season === 'summer') return 'Peak summer conditions'
  if (season === 'fall') return 'Cooling down, variable skies'
  return 'Typical seasonal weather'
}

function seasonTag(
  stats: {
    isBest: boolean
    isWorst: boolean
    isRainiest: boolean
    isWarmest: boolean
    isCoolest: boolean
  },
  months: MonthlyClimate[],
): { label: string; tone: SeasonTagTone } {
  const meanHumidityValues = months
    .map((month) => month.avgHumidityPct)
    .filter((value): value is number => value != null)
  const meanHumidity = meanHumidityValues.length
    ? meanHumidityValues.reduce((sum, value) => sum + value, 0) / meanHumidityValues.length
    : null

  if (stats.isBest) return { label: 'Best time', tone: 'success' }
  if (stats.isWorst && stats.isRainiest) return { label: 'Difficult', tone: 'danger' }
  if (stats.isWorst) return { label: 'Difficult', tone: 'danger' }
  if (stats.isWarmest) return { label: 'Warm', tone: 'warning' }
  if (meanHumidity != null && meanHumidity > 75) return { label: 'Humid', tone: 'warning' }
  if (stats.isCoolest) return { label: 'Cool', tone: 'info' }
  if (stats.isRainiest) return { label: 'Wet', tone: 'info' }
  return { label: 'Mild', tone: 'muted' }
}

function deriveSeasonCards(climate: CityClimate, lat: number): SeasonCard[] {
  const seasonKeys: SeasonKey[] = ['winter', 'spring', 'summer', 'fall']
  const seasonData = seasonKeys.map((season) => {
    const months = monthsForSeason(climate, season, lat)
    const meanTemp =
      months.reduce((sum, month) => sum + monthlyMeanTempC(month), 0) / Math.max(months.length, 1)
    const totalPrecip = months.reduce((sum, month) => sum + month.avgPrecipMm, 0)
    const tempLowC = Math.min(...months.map((month) => month.avgLowC))
    const tempHighC = Math.max(...months.map((month) => month.avgHighC))
    const comfort = seasonComfortScore(months)
    return { season, months, meanTemp, totalPrecip, tempLowC, tempHighC, comfort }
  })

  const bestSeason = [...seasonData].sort((a, b) => b.comfort - a.comfort)[0]?.season
  const worstSeason = [...seasonData].sort((a, b) => a.comfort - b.comfort)[0]?.season
  const rainiestSeason = [...seasonData].sort((a, b) => b.totalPrecip - a.totalPrecip)[0]?.season
  const driestSeason = [...seasonData].sort((a, b) => a.totalPrecip - b.totalPrecip)[0]?.season
  const warmestSeason = [...seasonData].sort((a, b) => b.meanTemp - a.meanTemp)[0]?.season
  const coolestSeason = [...seasonData].sort((a, b) => a.meanTemp - b.meanTemp)[0]?.season

  return seasonData.map(({ season, months, tempLowC, tempHighC }) => {
    const stats = {
      isBest: season === bestSeason,
      isWorst: season === worstSeason,
      isRainiest: season === rainiestSeason,
      isDriest: season === driestSeason,
      isWarmest: season === warmestSeason,
      isCoolest: season === coolestSeason,
    }
    const tag = seasonTag(stats, months)
    return {
      season,
      seasonLabel: SEASON_LABELS[season],
      tempLowC,
      tempHighC,
      description: describeSeason(season, months, stats),
      tagLabel: tag.label,
      tagTone: tag.tone,
    }
  })
}

function deriveClimateTags(climate: CityClimate, category: ClimateNotesCategory | null): ClimateTag[] {
  const tags: ClimateTag[] = []
  const humidity = resolveHumidity(climate)
  const maxHigh = Math.max(...climate.monthly.map((month) => month.avgHighC))
  const minLow = Math.min(...climate.monthly.map((month) => month.avgLowC))
  const tempSwing = maxHigh - minLow

  if (humidity != null && humidity >= 75) {
    tags.push({ label: 'High humidity', tone: 'humidity' })
  }
  if (climate.annualAvgTempC > 22 && minLow > 15) {
    tags.push({ label: 'Hot year-round', tone: 'heat' })
  } else if (maxHigh > 30) {
    tags.push({ label: 'Hot summers', tone: 'heat' })
  }
  if (climate.winterAvgTempC < 5 || minLow < -5) {
    tags.push({ label: 'Cold winters', tone: 'cold' })
  }
  if (tempSwing >= 22) {
    tags.push({ label: 'Four seasons', tone: 'seasonal' })
  }
  const wetMonths = rainyMonths(climate)
  if (wetMonths.length >= 4 && wetMonths.length <= 8) {
    tags.push({ label: 'Rainy season', tone: 'rain' })
  }
  if (humidity != null && humidity < 55 && climate.annualAvgTempC >= 15) {
    tags.push({ label: 'Dry air', tone: 'dry' })
  }

  if (!tags.length && category === 'mediterranean') {
    tags.push({ label: 'Dry summers', tone: 'dry' })
  }

  return tags.slice(0, 3)
}

function deriveConsiderations(
  climate: CityClimate,
  category: ClimateNotesCategory | null,
  humidity: number | null,
): ClimateConsideration[] {
  const items: ClimateConsideration[] = []
  const maxHigh = Math.max(...climate.monthly.map((month) => month.avgHighC))
  const minLow = Math.min(...climate.monthly.map((month) => month.avgLowC))
  const wet = rainyMonths(climate)
  const wetRange = formatMonthRange(wet.map((month) => month.month))

  if (humidity != null && humidity >= 70) {
    items.push({
      id: 'humidity',
      title: 'High humidity year-round',
      description: `Averages ${humidity}% — air conditioning is a daily necessity, not a luxury.`,
      tone: 'muted',
      emphasized: humidity < 80,
    })
  }

  if (wet.length >= 3 && wetRange) {
    items.push({
      id: 'rainy-season',
      title: 'Distinct rainy season',
      description: `Heavy daily rains ${wetRange} can limit outdoor activity.`,
      tone: 'info',
      emphasized: true,
    })
  }

  if (minLow > 18 || (category === 'tropical_humid' && minLow > 15)) {
    items.push({
      id: 'no-cool-season',
      title: 'No cool season',
      description: `Temps rarely drop below ${Math.round(minLow)}°C — little relief from heat.`,
      tone: 'danger',
      emphasized: true,
    })
  }

  if (climate.winterAvgTempC < 0 || minLow < -10) {
    items.push({
      id: 'freezing-winter',
      title: 'Freezing winters',
      description: 'Ice and snow are common — mobility and heating costs need planning.',
      tone: 'danger',
      emphasized: true,
    })
  }

  if (maxHigh > 35) {
    items.push({
      id: 'extreme-heat',
      title: 'Extreme summer heat',
      description: `Peak highs near ${Math.round(maxHigh)}°C — heat stress is a real risk.`,
      tone: 'warning',
      emphasized: true,
    })
  }

  if (category === 'mediterranean') {
    items.push({
      id: 'dry-summer',
      title: 'Dry summer pattern',
      description: 'Little rain Jun–Sep — wildfire smoke and water use can spike in hot years.',
      tone: 'info',
      emphasized: true,
    })
  }

  return items.slice(0, 4)
}

function fallbackCategoryLabel(climate: CityClimate): string {
  return climate.climateLabel || 'Typical climate'
}

function fallbackDescription(climate: CityClimate): string {
  return `${climate.climateLabel}. Annual average ${Math.round(climate.annualAvgTempC)}°C with ${climate.wettestMonth} as the wettest month.`
}

function fallbackRetireeNote(): string {
  return 'For retirees: Check how heat, cold, and humidity align with your health needs. Trial a long stay across seasons before committing.'
}

/** Rich weather-tab view model derived from Open-Meteo climate aggregates. */
export function deriveClimateDetail(climate: CityClimate, lat = 0): ClimateDetailView {
  const category = classifyClimateType(climate)
  const humidity = resolveHumidity(climate)
  const wet = rainyMonths(climate)
  const avgHighC =
    climate.monthly.reduce((sum, month) => sum + month.avgHighC, 0) / climate.monthly.length

  return {
    category,
    categoryLabel: category ? CATEGORY_LABELS[category] : fallbackCategoryLabel(climate),
    tags: deriveClimateTags(climate, category),
    description: category
      ? CATEGORY_DESCRIPTIONS[category](climate, humidity)
      : fallbackDescription(climate),
    retireeNote: category ? RETIREE_NOTES[category] : fallbackRetireeNote(),
    metrics: {
      avgHighC,
      avgHumidityPct: humidity,
      humidityLabel: humidityComfortLabel(humidity),
      rainyMonthCount: wet.length,
      rainyMonthRange: wet.length ? formatMonthRange(wet.map((month) => month.month)) : null,
    },
    seasons: deriveSeasonCards(climate, lat),
    considerations: deriveConsiderations(climate, category, humidity),
  }
}

export function formatTempRange(lowC: number, highC: number, unit: 'c' | 'f'): string {
  if (unit === 'f') {
    const lowF = Math.round(lowC * (9 / 5) + 32)
    const highF = Math.round(highC * (9 / 5) + 32)
    return `${lowF}–${highF}°F`
  }
  return `${Math.round(lowC)}–${Math.round(highC)}°C`
}
