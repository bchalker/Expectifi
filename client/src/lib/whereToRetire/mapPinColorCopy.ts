import type { MapPinColorView } from './mapPinDisplay'
import type { MapWhereToLook } from './whereToLookCountries'
import {
  BUDGET_PIN_LEGEND,
  EXPAT_PIN_LEGEND,
  SCORE_PIN_LEGEND,
} from './mapPinDisplay'

export type MapPinLegendSegment = {
  label: string
  color: string
}

export type MapPinViewChromeCopy = {
  title: string
  description: string
  legend: MapPinLegendSegment[]
}

const VIEW_COPY: Record<MapPinColorView, MapPinViewChromeCopy> = {
  score: {
    title: 'Your best retirement matches',
    description:
      'Combines how far your income goes with quality of life — safety, healthcare, climate, and air quality. A green pin means the city is both affordable AND a good place to live. Use this view to find your shortlist.',
    legend: SCORE_PIN_LEGEND.map((item) => ({
      label: item.label,
      color: item.color,
    })),
  },
  budget: {
    title: 'Where your money goes furthest',
    description:
      "Shows only affordability — how much of your monthly budget each city requires. Useful for finding hidden gems. Remember cheap doesn't always mean good — switch to Best overall fit to add quality of life context.",
    legend: [
      { label: 'Well within budget', color: BUDGET_PIN_LEGEND[0].color },
      { label: 'Comfortable', color: BUDGET_PIN_LEGEND[1].color },
      { label: 'Tight', color: BUDGET_PIN_LEGEND[2].color },
      { label: 'Over budget', color: BUDGET_PIN_LEGEND[3].color },
    ],
  },
  expat: {
    title: 'Find your expat community',
    description:
      'An expat (short for expatriate) is someone living outside their home country. Green pins show cities with large, established communities of Americans and other foreigners — built-in social networks, English-friendly services, and neighbors who\'ve already figured out the paperwork. A good starting point if community matters to you.',
    legend: [
      { label: 'Enormous', color: EXPAT_PIN_LEGEND[0].color },
      { label: 'Very large', color: EXPAT_PIN_LEGEND[1].color },
      { label: 'Large', color: EXPAT_PIN_LEGEND[2].color },
      { label: 'Moderate', color: EXPAT_PIN_LEGEND[3].color },
      { label: 'Limited data', color: EXPAT_PIN_LEGEND[4].color },
    ],
  },
}

const VIEW_BUTTON_LABELS: Record<MapPinColorView, string> = {
  score: 'Best overall fit',
  budget: 'Lowest cost',
  expat: 'Expat friendly',
}

export const MAP_PIN_VIEW_OPTIONS: { id: MapPinColorView; label: string }[] = [
  { id: 'score', label: VIEW_BUTTON_LABELS.score },
  { id: 'budget', label: VIEW_BUTTON_LABELS.budget },
  { id: 'expat', label: VIEW_BUTTON_LABELS.expat },
]

/** Expat pin data is international; hide that view for US-only geography. */
export function mapPinViewOptionsForWhereToLook(
  whereToLook: MapWhereToLook,
): { id: MapPinColorView; label: string }[] {
  if (whereToLook === 'us') {
    return MAP_PIN_VIEW_OPTIONS.filter((opt) => opt.id !== 'expat')
  }
  return MAP_PIN_VIEW_OPTIONS
}

export function mapPinViewChromeCopy(view: MapPinColorView): MapPinViewChromeCopy {
  return VIEW_COPY[view]
}
