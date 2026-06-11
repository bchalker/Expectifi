import type { CityClimate, MonthlyClimate } from '../lib/api/openMeteo'

/** Ideal monthly mean temperature band (°C). */
export const CLIMATE_COMFORT_TEMP_MIN_C = 15
export const CLIMATE_COMFORT_TEMP_MAX_C = 28

const TEMP_PENALTY_PER_DEGREE = 4
const HARD_HEAT_PENALTY = 25
const HARD_HEAT_THRESHOLD_C = 35
const HARD_COLD_PENALTY = 20
const HARD_COLD_THRESHOLD_C = 0

const HUMIDITY_PENALTY_MODERATE = 15
const HUMIDITY_MODERATE_THRESHOLD = 75
const HUMIDITY_PENALTY_OPPRESSIVE = 30
const HUMIDITY_OPPRESSIVE_THRESHOLD = 85

export type ClimateComfortBreakdown = {
  tempComfortScore: number
  humidityPenalty: number
  climateScore: number
  annualAvgHumidityPct: number | null
}

function monthlyMeanTempC(month: MonthlyClimate): number {
  return (month.avgHighC + month.avgLowC) / 2
}

/** Temperature axis: comfort band 15–28°C with per-degree and hard extreme penalties. */
export function computeTempComfortScore(monthly: MonthlyClimate[]): number {
  if (!monthly.length) return 50

  let score = 100

  for (const month of monthly) {
    const mean = monthlyMeanTempC(month)
    if (mean < CLIMATE_COMFORT_TEMP_MIN_C) {
      score -= (CLIMATE_COMFORT_TEMP_MIN_C - mean) * TEMP_PENALTY_PER_DEGREE
    } else if (mean > CLIMATE_COMFORT_TEMP_MAX_C) {
      score -= (mean - CLIMATE_COMFORT_TEMP_MAX_C) * TEMP_PENALTY_PER_DEGREE
    }
  }

  const maxHigh = Math.max(...monthly.map((m) => m.avgHighC))
  const minLow = Math.min(...monthly.map((m) => m.avgLowC))

  if (maxHigh > HARD_HEAT_THRESHOLD_C) score -= HARD_HEAT_PENALTY
  if (minLow < HARD_COLD_THRESHOLD_C) score -= HARD_COLD_PENALTY

  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Humidity axis: penalize sticky tropical air (>75% / >85% avg RH). */
export function computeHumidityPenalty(annualAvgHumidityPct: number | null | undefined): number {
  if (annualAvgHumidityPct == null || !Number.isFinite(annualAvgHumidityPct)) return 0
  if (annualAvgHumidityPct > HUMIDITY_OPPRESSIVE_THRESHOLD) return HUMIDITY_PENALTY_OPPRESSIVE
  if (annualAvgHumidityPct > HUMIDITY_MODERATE_THRESHOLD) return HUMIDITY_PENALTY_MODERATE
  return 0
}

export function computeClimateComfortScore(climate: CityClimate): ClimateComfortBreakdown {
  const tempComfortScore = computeTempComfortScore(climate.monthly)
  const humidityPct =
    climate.annualAvgHumidityPct ??
    (climate.monthly.some((month) => month.avgHumidityPct != null)
      ? climate.monthly.reduce((sum, month) => sum + (month.avgHumidityPct ?? 0), 0) /
        climate.monthly.filter((month) => month.avgHumidityPct != null).length
      : null)
  const humidityPenalty = computeHumidityPenalty(humidityPct)
  const climateScore = Math.max(0, Math.round(tempComfortScore - humidityPenalty))

  return {
    tempComfortScore,
    humidityPenalty,
    climateScore,
    annualAvgHumidityPct: humidityPct ?? null,
  }
}
