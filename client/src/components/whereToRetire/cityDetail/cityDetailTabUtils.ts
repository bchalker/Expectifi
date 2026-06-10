import type { CSSProperties } from 'react'
import { formatUsd } from '../../../utils/costOfLiving'
import { getQualityOfLifeData } from '../../../utils/qualityOfLife'

export const MISSING_FIELD_TEXT = 'Not reported'
export const INDEX_UNAVAILABLE_DISPLAY = '—'

export type DollarStrengthBand = 'strong' | 'moderate' | 'weak'

export function getColIndexForCountry(country: string): number | null {
  const qol = getQualityOfLifeData(country)
  if (qol?.cost_of_living_index == null) return null
  return Math.round(qol.cost_of_living_index)
}

export function usPurchasingPowerMultiplier(colIndex: number): number {
  return Number((100 / colIndex).toFixed(1))
}

export function dollarStrengthBand(multiplier: number): DollarStrengthBand {
  if (multiplier >= 2) return 'strong'
  if (multiplier >= 1) return 'moderate'
  return 'weak'
}

export const DOLLAR_STRENGTH_LABELS: Record<DollarStrengthBand, string> = {
  strong: 'Dollar is strong here',
  moderate: 'Dollar is moderate here',
  weak: 'Dollar is weak here',
}

export type CityDetailTabStaggerProps = {
  staggerClassName?: string
  staggerStyle?: (index: number) => CSSProperties
}

export function staggerSectionProps(
  index: number,
  baseClass: string | undefined,
  staggerClassName: string | undefined,
  staggerStyle: ((index: number) => CSSProperties) | undefined,
): { className?: string; style?: CSSProperties } {
  if (!staggerClassName || !staggerStyle) {
    return baseClass ? { className: baseClass } : {}
  }
  return {
    className: baseClass ? `${baseClass} ${staggerClassName}` : staggerClassName,
    style: staggerStyle(index),
  }
}

export function formatUsdField(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return MISSING_FIELD_TEXT
  }
  return formatUsd(amount)
}

export function formatTextField(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : MISSING_FIELD_TEXT
}
