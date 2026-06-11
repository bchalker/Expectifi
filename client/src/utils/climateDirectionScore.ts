import type { CityClimate, MonthlyClimate } from '../lib/api/openMeteo'
import type { ClimatePreferenceDirection } from '../types/preferences'

export type ClimateMetrics = {
  avgTempC: number
  avgHighC: number
  avgHumidityPct: number | null
  avgWinterLowC: number
  minWinterLowC: number
  avgSummerHighC: number
  maxSummerHighC: number
  minMonthlyAvgC: number
  maxMonthlyAvgC: number
  tempSwingC: number
  monthsAbove36High: number
  monthsAbove35High: number
  monthsAbove25Mean: number
}

function monthlyMeanTempC(month: MonthlyClimate): number {
  return (month.avgHighC + month.avgLowC) / 2
}

function annualAvgHumidityFromMonthly(monthly: MonthlyClimate[]): number | null {
  const values = monthly
    .map((month) => month.avgHumidityPct)
    .filter((value): value is number => value != null && Number.isFinite(value))
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function coldestMonthLows(monthly: MonthlyClimate[], count: number): MonthlyClimate[] {
  return [...monthly].sort((a, b) => a.avgLowC - b.avgLowC).slice(0, count)
}

function hottestMonthHighs(monthly: MonthlyClimate[], count: number): MonthlyClimate[] {
  return [...monthly].sort((a, b) => b.avgHighC - a.avgHighC).slice(0, count)
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Open-Meteo monthly aggregates used for direction scoring and hard caps. */
export function extractClimateMetrics(climate: CityClimate): ClimateMetrics {
  const { monthly } = climate
  const monthlyMeans = monthly.map(monthlyMeanTempC)
  const coldest3 = coldestMonthLows(monthly, 3)
  const hottest3 = hottestMonthHighs(monthly, 3)

  const avgTempC = Number.isFinite(climate.annualAvgTempC)
    ? climate.annualAvgTempC
    : monthlyMeans.reduce((sum, value) => sum + value, 0) / Math.max(monthlyMeans.length, 1)

  const avgHighC =
    monthly.reduce((sum, month) => sum + month.avgHighC, 0) / Math.max(monthly.length, 1)

  const avgWinterLowC =
    coldest3.reduce((sum, month) => sum + month.avgLowC, 0) / Math.max(coldest3.length, 1)

  const avgSummerHighC =
    hottest3.reduce((sum, month) => sum + month.avgHighC, 0) / Math.max(hottest3.length, 1)

  return {
    avgTempC,
    avgHighC,
    avgHumidityPct: climate.annualAvgHumidityPct ?? annualAvgHumidityFromMonthly(monthly),
    avgWinterLowC,
    minWinterLowC: Math.min(...monthly.map((month) => month.avgLowC)),
    avgSummerHighC,
    maxSummerHighC: Math.max(...monthly.map((month) => month.avgHighC)),
    minMonthlyAvgC: Math.min(...monthlyMeans),
    maxMonthlyAvgC: Math.max(...monthlyMeans),
    tempSwingC:
      Math.max(...monthly.map((month) => month.avgHighC)) -
      Math.min(...monthly.map((month) => month.avgLowC)),
    monthsAbove36High: monthly.filter((month) => month.avgHighC > 36).length,
    monthsAbove35High: monthly.filter((month) => month.avgHighC > 35).length,
    monthsAbove25Mean: monthly.filter((month) => monthlyMeanTempC(month) > 25).length,
  }
}

function scoreWarmDry(metrics: ClimateMetrics): number {
  let score = 100
  const humidity = metrics.avgHumidityPct

  if (humidity != null) {
    if (humidity > 80) score -= 45
    else if (humidity > 70) score -= 25
    else if (humidity > 60) score -= 10
  }

  if (metrics.avgHighC > 36) score -= 35
  else if (metrics.avgHighC > 32) score -= 15

  if (metrics.avgWinterLowC < 0) score -= 30
  else if (metrics.avgWinterLowC < 5) score -= 15

  if (metrics.avgTempC < 18) score -= Math.min(24, (18 - metrics.avgTempC) * 4)
  if (metrics.avgTempC > 26) score -= Math.min(24, (metrics.avgTempC - 26) * 4)

  if (
    metrics.avgTempC >= 18 &&
    metrics.avgTempC <= 24 &&
    humidity != null &&
    humidity < 55
  ) {
    score += 10
  }

  return clampScore(score)
}

function scoreFourSeasons(metrics: ClimateMetrics): number {
  let score = 100

  if (metrics.minMonthlyAvgC > 18) score -= 30

  if (metrics.avgWinterLowC < -15) score -= 40
  else if (metrics.avgWinterLowC < -5) score -= 20

  if (metrics.avgSummerHighC > 35) score -= 25

  if (metrics.avgHumidityPct != null && metrics.avgHumidityPct > 75) score -= 20

  const clearSeasons =
    metrics.tempSwingC >= 18 &&
    metrics.minMonthlyAvgC < 15 &&
    metrics.maxMonthlyAvgC > 20 &&
    metrics.avgSummerHighC <= 35 &&
    metrics.avgWinterLowC > -15

  if (clearSeasons) score += 10

  return clampScore(score)
}

function scoreCoolMild(metrics: ClimateMetrics): number {
  let score = 100

  if (metrics.avgSummerHighC > 33) score -= 40
  else if (metrics.avgSummerHighC > 28) score -= 20

  const humidity = metrics.avgHumidityPct
  if (humidity != null) {
    if (humidity > 80) score -= 35
    else if (humidity > 70) score -= 20
  }

  if (metrics.avgWinterLowC < -10) score -= 25

  if (metrics.avgTempC > 28) score -= Math.min(30, (metrics.avgTempC - 28) * 5)
  if (metrics.avgTempC < 8) score -= Math.min(20, (8 - metrics.avgTempC) * 4)

  if (
    metrics.avgTempC >= 10 &&
    metrics.avgTempC <= 18 &&
    metrics.monthsAbove25Mean === 0
  ) {
    score += 10
  }

  return clampScore(score)
}

/** Direction-aware climate score (0–100). Returns 50 when direction is none. */
export function computeClimateDirectionScore(
  climate: CityClimate,
  direction: ClimatePreferenceDirection,
): number {
  if (direction === 'none' || !climate.monthly.length) return 50

  const metrics = extractClimateMetrics(climate)

  switch (direction) {
    case 'warm_dry':
      return scoreWarmDry(metrics)
    case 'four_seasons':
      return scoreFourSeasons(metrics)
    case 'cool_mild':
      return scoreCoolMild(metrics)
    default:
      return 50
  }
}

export function collectDirectionMismatchIssues(
  metrics: ClimateMetrics,
  direction: ClimatePreferenceDirection,
): string[] {
  if (direction === 'none') return []

  const issues: string[] = []

  switch (direction) {
    case 'warm_dry':
      if (metrics.avgHumidityPct != null && metrics.avgHumidityPct > 70) {
        issues.push('humidity above your warm & dry ideal')
      }
      if (metrics.avgWinterLowC < 5) issues.push('colder winters than you prefer')
      if (metrics.avgHighC > 32) issues.push('summer heat above your ideal')
      break
    case 'four_seasons':
      if (metrics.minMonthlyAvgC > 18) issues.push('no real cool season')
      if (metrics.avgWinterLowC < -5) issues.push('harsher winters than ideal')
      if (metrics.avgSummerHighC > 35) issues.push('extreme summer heat')
      break
    case 'cool_mild':
      if (metrics.avgSummerHighC > 28) issues.push('warmer summers than you prefer')
      if (metrics.avgHumidityPct != null && metrics.avgHumidityPct > 70) {
        issues.push('humidity above your cool & mild ideal')
      }
      if (metrics.avgWinterLowC < -10) issues.push('subarctic winter cold')
      break
    default:
      break
  }

  return issues
}
