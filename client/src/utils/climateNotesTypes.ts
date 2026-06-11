import type { CityClimate, MonthlyClimate } from '../lib/api/openMeteo'

export type ClimateNotesCategory =
  | 'tropical_humid'
  | 'subtropical_humid'
  | 'mediterranean'
  | 'subtropical_dry'
  | 'mild_temperate'
  | 'continental'
  | 'subarctic'

function monthlyMeanTempC(month: MonthlyClimate): number {
  return (month.avgHighC + month.avgLowC) / 2
}

function annualAvgTempFromMonthly(monthly: MonthlyClimate[]): number {
  return monthly.reduce((sum, month) => sum + monthlyMeanTempC(month), 0) / monthly.length
}

function annualAvgHumidityFromMonthly(monthly: MonthlyClimate[]): number | null {
  const values = monthly
    .map((month) => month.avgHumidityPct)
    .filter((value): value is number => value != null && Number.isFinite(value))
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function classifyClimateType(climate: CityClimate): ClimateNotesCategory | null {
  const { monthly, summerAvgTempC, winterAvgTempC } = climate
  if (!monthly.length) return null

  const avgTemp = Number.isFinite(climate.annualAvgTempC)
    ? climate.annualAvgTempC
    : annualAvgTempFromMonthly(monthly)
  const humidity =
    climate.annualAvgHumidityPct ?? annualAvgHumidityFromMonthly(monthly)
  const maxHigh = Math.max(...monthly.map((month) => month.avgHighC))
  const minLow = Math.min(...monthly.map((month) => month.avgLowC))
  const tempSwing = maxHigh - minLow

  if (minLow < -12 || winterAvgTempC < -8 || avgTemp < 2) return 'subarctic'
  if (tempSwing >= 28 && minLow < 0 && summerAvgTempC > 18) return 'continental'

  if (humidity != null) {
    if (avgTemp > 26 && humidity > 75) return 'tropical_humid'
    if (avgTemp >= 20 && avgTemp <= 26 && humidity > 70) return 'subtropical_humid'
    if (avgTemp >= 15 && avgTemp <= 25 && humidity < 60) return 'mediterranean'
    if (avgTemp >= 18 && avgTemp <= 30 && humidity < 50) return 'subtropical_dry'
  }

  if (avgTemp >= 10 && avgTemp <= 18) return 'mild_temperate'

  if (humidity == null && avgTemp >= 18) return 'subtropical_dry'

  return null
}
