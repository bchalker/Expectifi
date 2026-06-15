import type { CityClimate } from '../lib/api/openMeteo'
import type { ClimatePreferenceDirection, PreferenceStep } from '../types/preferences'
import {
  formatClimateTempRange,
  isClimateTempRangeUnset,
} from '../types/preferences'
import {
  collectDirectionMismatchIssues,
  computeClimateDirectionScore,
  computeClimateTemperatureRangeScore,
  extractClimateMetrics,
} from './climateDirectionScore'
import { climateDirectionShortLabel } from './climatePreferenceCopy'
import { classifyClimateType, type ClimateNotesCategory } from './climateNotesTypes'

export type { ClimateNotesCategory } from './climateNotesTypes'
export { classifyClimateType } from './climateNotesTypes'

export type ClimateNotesFitTone = 'muted' | 'success' | 'warning' | 'danger'

export type ClimateNotesResult = {
  category: ClimateNotesCategory | null
  categoryLabel: string | null
  climateScore: number | null
  climateNotes: string
  /** Preference fit copy without the parenthetical score — for summary card body text. */
  matchSummary: string
  fitTone: ClimateNotesFitTone
}

const CLIMATE_TYPE_COPY: Record<
  ClimateNotesCategory,
  { categoryLabel: string; climateNotes: string }
> = {
  tropical_humid: {
    categoryLabel: 'Tropical humid',
    climateNotes: 'Hot and humid year-round — may feel oppressive',
  },
  subtropical_humid: {
    categoryLabel: 'Subtropical humid',
    climateNotes: 'Warm but humid summers — consider spring/fall',
  },
  mediterranean: {
    categoryLabel: 'Mediterranean',
    climateNotes: 'Dry, mild, and comfortable most of the year',
  },
  subtropical_dry: {
    categoryLabel: 'Subtropical dry',
    climateNotes: 'Warm and dry — comfortable for most retirees',
  },
  mild_temperate: {
    categoryLabel: 'Mild temperate',
    climateNotes: 'Cool and moderate — distinct seasons',
  },
  continental: {
    categoryLabel: 'Continental',
    climateNotes: 'Cold winters and warm summers — plan accordingly',
  },
  subarctic: {
    categoryLabel: 'Subarctic / harsh',
    climateNotes: 'Harsh winters — not suited to most retirees',
  },
}

function fitToneFor(score: number, step: PreferenceStep): ClimateNotesFitTone {
  if (step === 0) return 'muted'
  if (step >= 8 && score < 45) return 'danger'
  if (step >= 5 && score < 50) return 'danger'
  if (score >= 75) return 'success'
  if (score >= 55) return 'warning'
  return 'danger'
}

function issueSuffix(issues: string[]): string {
  if (!issues.length) return ''
  return ` — ${issues.join('; ')}`
}

function preferenceFitCopy(
  score: number,
  step: PreferenceStep,
  directionLabel: string,
  issues: string[],
): string {
  const suffix = issueSuffix(issues)
  const scoreLabel = `${score}/100`

  if (step >= 10) {
    if (score >= 70) {
      return `Strong match (${scoreLabel}) for your ${directionLabel} preference at non-negotiable weight.`
    }
    if (score >= 45) {
      return `Mixed fit (${scoreLabel}) for your ${directionLabel} preference${suffix}. This may limit your retirement score.`
    }
    return `Poor fit (${scoreLabel}) for your ${directionLabel} preference${suffix}. Climate is a dealbreaker in your settings.`
  }

  if (step >= 8) {
    if (score >= 70) {
      return `Good fit (${scoreLabel}) for your ${directionLabel} preference${suffix}.`
    }
    if (score >= 45) {
      return `Moderate fit (${scoreLabel}) for your ${directionLabel} preference${suffix}.`
    }
    return `Weak fit (${scoreLabel}) for your ${directionLabel} preference${suffix}.`
  }

  if (step >= 5) {
    if (score >= 65) {
      return `Comfortable fit (${scoreLabel}) for your ${directionLabel} preference${suffix}.`
    }
    return `Below your ${directionLabel} ideal (${scoreLabel})${suffix}.`
  }

  if (score >= 65) {
    return `Generally aligns with ${directionLabel} (${scoreLabel})${suffix}.`
  }

  return `Climate fit for ${directionLabel}: ${scoreLabel}${suffix}.`
}

function matchSummaryFromFitCopy(fitCopy: string): string {
  return fitCopy.replace(/\s*\(\d+\/100\)/g, '')
}

/** Plain-language climate notes tied to temperature range + weight preferences. */
export function deriveClimateNotes(
  climate: CityClimate,
  climatePreferenceStep: PreferenceStep = 0,
  climatePreferenceDirection: ClimatePreferenceDirection = 'none',
  climateTempMinF?: number,
  climateTempMaxF?: number,
): ClimateNotesResult | null {
  if (!climate.monthly.length) return null

  const category = classifyClimateType(climate)
  const typeCopy = category ? CLIMATE_TYPE_COPY[category] : null
  const usesTempRange =
    climateTempMinF != null &&
    climateTempMaxF != null &&
    !isClimateTempRangeUnset(climateTempMinF, climateTempMaxF)

  const score = usesTempRange
    ? computeClimateTemperatureRangeScore(climate, climateTempMinF, climateTempMaxF)
    : computeClimateDirectionScore(climate, climatePreferenceDirection)

  const metrics = extractClimateMetrics(climate)
  const issues = usesTempRange
    ? []
    : collectDirectionMismatchIssues(metrics, climatePreferenceDirection)

  const directionLabel = usesTempRange
    ? formatClimateTempRange(climateTempMinF, climateTempMaxF)
    : climateDirectionShortLabel(climatePreferenceDirection)

  if (climatePreferenceStep === 0) {
    if (typeCopy) {
      return {
        category,
        categoryLabel: typeCopy.categoryLabel,
        climateScore: score,
        climateNotes: `${typeCopy.climateNotes} Climate comfort isn't weighted in your score.`,
        matchSummary: typeCopy.climateNotes,
        fitTone: 'muted',
      }
    }
    return {
      category: null,
      categoryLabel: null,
      climateScore: score,
      climateNotes:
        'Set climate comfort in preferences to see how this destination fits your priorities.',
      matchSummary:
        'Set climate comfort in preferences to see how this destination fits your priorities.',
      fitTone: 'muted',
    }
  }

  const fitCopy = preferenceFitCopy(
    score,
    climatePreferenceStep,
    directionLabel,
    issues,
  )
  const typeLead = typeCopy ? `${typeCopy.categoryLabel}: ${typeCopy.climateNotes}. ` : ''

  return {
    category,
    categoryLabel: typeCopy?.categoryLabel ?? null,
    climateScore: score,
    climateNotes: `${typeLead}${fitCopy}`.trim(),
    matchSummary: matchSummaryFromFitCopy(fitCopy),
    fitTone: fitToneFor(score, climatePreferenceStep),
  }
}
