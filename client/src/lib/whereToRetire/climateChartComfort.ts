import type { ClimatePreferenceDirection } from '../../types/preferences'
import { climateDirectionShortLabel } from '../../utils/climatePreferenceCopy'

export type ComfortBand = {
  minC: number
  maxC: number
  legendLabel: string
}

export function celsiusToFahrenheit(c: number): number {
  return c * (9 / 5) + 32
}

export function tempInDisplayUnit(valueC: number, unit: 'c' | 'f'): number {
  return unit === 'f' ? celsiusToFahrenheit(valueC) : valueC
}

export function formatTempRangeLabel(minC: number, maxC: number, unit: 'c' | 'f'): string {
  if (unit === 'f') {
    return `${Math.round(celsiusToFahrenheit(minC))}–${Math.round(celsiusToFahrenheit(maxC))}°F`
  }
  return `${Math.round(minC)}–${Math.round(maxC)}°C`
}

export function comfortBandForPreference(
  step: number,
  direction: ClimatePreferenceDirection,
  tempUnit: 'c' | 'f' = 'c',
): ComfortBand | null {
  if (step <= 0 || direction === 'none') return null

  switch (direction) {
    case 'warm_dry':
      return {
        minC: 18,
        maxC: 24,
        legendLabel: `Comfortable for your ${climateDirectionShortLabel(direction).toLowerCase()} preference (${formatTempRangeLabel(18, 24, tempUnit)})`,
      }
    case 'four_seasons':
      return {
        minC: 12,
        maxC: 26,
        legendLabel: `Comfortable for your ${climateDirectionShortLabel(direction).toLowerCase()} preference (${formatTempRangeLabel(12, 26, tempUnit)})`,
      }
    case 'cool_mild':
      return {
        minC: 10,
        maxC: 22,
        legendLabel: `Comfortable for your ${climateDirectionShortLabel(direction).toLowerCase()} preference (${formatTempRangeLabel(10, 22, tempUnit)})`,
      }
    default:
      return null
  }
}

export function monthMeanTempC(avgHighC: number, avgLowC: number): number {
  return (avgHighC + avgLowC) / 2
}

/** Month mean sits inside the comfort band (for bar highlight). */
export function monthInComfortBand(
  avgHighC: number,
  avgLowC: number,
  band: ComfortBand,
): boolean {
  const mean = monthMeanTempC(avgHighC, avgLowC)
  return mean >= band.minC && mean <= band.maxC
}

export function formatChartTemp(valueC: number, unit: 'c' | 'f'): string {
  if (unit === 'f') {
    return `${Math.round(celsiusToFahrenheit(valueC))}°F`
  }
  return `${Math.round(valueC)}°C`
}

/** Format a tick value already in the chart's display unit. */
export function formatChartAxisTick(value: number, unit: 'c' | 'f'): string {
  if (unit === 'f') {
    return `${Math.round(value)}°F`
  }
  return `${Math.round(value)}°C`
}

export function axisTickStep(axisMin: number, axisMax: number, unit: 'c' | 'f'): number {
  const spread = axisMax - axisMin
  if (unit === 'f') return spread > 45 ? 10 : 5
  return spread > 25 ? 10 : 5
}

/** Round axis max up to nearest step (5°C default). */
export function roundAxisMax(value: number, step = 5): number {
  return Math.ceil(value / step) * step
}

export function roundAxisMin(value: number, step = 5): number {
  return Math.floor(value / step) * step
}
