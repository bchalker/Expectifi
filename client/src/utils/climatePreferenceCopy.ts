import type { ClimatePreferenceDirection } from '../types/preferences'

export type ClimateDirectionOption = {
  id: ClimatePreferenceDirection
  label: string
  hint: string
}

export const CLIMATE_DIRECTION_OPTIONS: ClimateDirectionOption[] = [
  {
    id: 'warm_dry',
    label: 'Warm & dry',
    hint:
      'I want comfortable warmth without the sticky heat — think Spain, Portugal, or Southern Italy. Humid tropics and harsh winters aren\'t for me.',
  },
  {
    id: 'four_seasons',
    label: 'Four seasons',
    hint:
      'I like distinct seasons — warm summers and crisp winters are fine, but extreme cold or year-round heat and humidity would wear on me.',
  },
  {
    id: 'cool_mild',
    label: 'Cool & mild',
    hint:
      'I prefer cooler, greener climates. Heat and humidity are a turnoff — I\'d rather layer up than sweat.',
  },
  {
    id: 'none',
    label: 'No preference',
    hint: "Climate direction won't affect scoring — only the weight applies.",
  },
]

const SHORT_LABELS: Record<ClimatePreferenceDirection, string> = {
  warm_dry: 'Warm & dry',
  four_seasons: 'Four seasons',
  cool_mild: 'Cool & mild',
  none: 'No preference',
}

export function climateDirectionShortLabel(
  direction: ClimatePreferenceDirection,
): string {
  return SHORT_LABELS[direction]
}

export function formatDirectionWeightBadge(
  weightBadge: string,
  direction?: ClimatePreferenceDirection | null,
): string {
  if (direction && direction !== 'none') {
    return `${climateDirectionShortLabel(direction)} · ${weightBadge}`
  }
  return weightBadge
}

const DIRECTION_CARD_HELPER: Record<
  Exclude<ClimatePreferenceDirection, 'none'>,
  string
> = {
  warm_dry: 'I want comfortable warmth without the sticky heat',
  four_seasons: 'I like distinct seasons without extremes',
  cool_mild: 'I prefer cooler, greener climates',
}

export function climateDirectionCardHelper(
  direction: ClimatePreferenceDirection,
): string {
  if (direction === 'none') return ''
  return DIRECTION_CARD_HELPER[direction]
}

export function climateDirectionPillClass(
  direction: ClimatePreferenceDirection,
): string {
  if (direction === 'warm_dry') return 'pref-factor-row__pill--direction-warm-dry'
  if (direction === 'four_seasons' || direction === 'cool_mild') {
    return 'pref-factor-row__pill--direction-mild'
  }
  return 'pref-factor-row__pill--direction-none'
}
