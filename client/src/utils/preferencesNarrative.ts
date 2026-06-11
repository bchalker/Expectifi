import type {
  CorePreferenceKey,
  DailyLifeFactorId,
  RetirementPreferences,
} from '../types/preferences'
import { ALL_CORE_KEYS, PREFERENCE_FACTOR_DEFINITIONS } from './preferenceFactors'

type ActiveFactor = {
  id: CorePreferenceKey | DailyLifeFactorId
  step: number
  noun: string
  isDaily: boolean
}

export function listToString(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

export function capitalizeSentence(sentence: string): string {
  const trimmed = sentence.trim()
  if (!trimmed) return trimmed
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return capped.endsWith('.') ? capped : `${capped}.`
}

function joinSentences(sentences: string[]): string {
  return sentences.map(capitalizeSentence).join(' ')
}

function joinWithVerb(items: string[], singular: string, plural: string): string {
  return items.length === 1 ? singular : plural
}

function collectActiveFactors(prefs: RetirementPreferences): ActiveFactor[] {
  const core: ActiveFactor[] = ALL_CORE_KEYS.map((key) => ({
    id: key,
    step: prefs[key],
    noun: PREFERENCE_FACTOR_DEFINITIONS[key].noun,
    isDaily: false,
  }))

  const daily: ActiveFactor[] = prefs.dailyLife.map((entry) => ({
    id: entry.factor,
    step: entry.step,
    noun: PREFERENCE_FACTOR_DEFINITIONS[entry.factor].noun,
    isDaily: true,
  }))

  return [...core, ...daily]
}

function climateAddendum(prefs: RetirementPreferences): string | null {
  if (prefs.climate < 2 || prefs.climatePreference === 'none') return null
  switch (prefs.climatePreference) {
    case 'warm_dry':
      return "You're drawn to warm, dry climates like the Mediterranean."
    case 'four_seasons':
      return 'You prefer a destination with distinct seasons.'
    case 'cool_mild':
      return 'Cooler, greener climates appeal to you most.'
    default:
      return null
  }
}

export function buildNarrative(prefs: RetirementPreferences): string {
  const factors = collectActiveFactors(prefs)
  const dealbreakerFactors = factors.filter((f) => f.step === 5 && !f.isDaily)
  const topPriorityFactors = factors.filter((f) => f.step === 4 && !f.isDaily)
  const importantFactors = factors.filter((f) => f.step === 3 && !f.isDaily)
  const minorFactors = factors.filter(
    (f) => (f.step === 1 || f.step === 2) && !f.isDaily,
  )
  const ignoredFactors = factors.filter((f) => f.step === 0 && !f.isDaily)
  const dailyImportantFactors = factors.filter((f) => f.isDaily && f.step >= 3)
  const dailyMinorFactors = factors.filter(
    (f) => f.isDaily && (f.step === 1 || f.step === 2),
  )

  const higherTierCount =
    (dealbreakerFactors.length > 0 ? 1 : 0) +
    (topPriorityFactors.length > 0 ? 1 : 0) +
    (importantFactors.length > 0 ? 1 : 0)

  const sentences: string[] = []

  if (dealbreakerFactors.length > 0) {
    const nouns = dealbreakerFactors.map((f) => f.noun)
    sentences.push(
      `${listToString(nouns)} ${joinWithVerb(nouns, 'is', 'are')} a dealbreaker — cities that fall short will be hard-capped in your score`,
    )
  }

  if (topPriorityFactors.length > 0) {
    const nouns = topPriorityFactors.map((f) => f.noun)
    sentences.push(
      `Your top ${joinWithVerb(nouns, 'priority is', 'priorities are')} ${listToString(nouns)}, carrying heavy weight across every city comparison`,
    )
  }

  if (importantFactors.length > 0) {
    const nouns = importantFactors.map((f) => f.noun)
    sentences.push(
      `${listToString(nouns)} ${joinWithVerb(nouns, 'matters', 'matter')} meaningfully, though ${joinWithVerb(nouns, 'it', 'they')} won't override everything else`,
    )
  }

  if (minorFactors.length > 0) {
    const nouns = minorFactors.map((f) => f.noun)
    if (higherTierCount === 0) {
      sentences.push(
        `You're keeping an open mind — ${listToString(nouns)} ${joinWithVerb(nouns, 'plays', 'play')} a minor role but won't define your results`,
      )
    } else {
      sentences.push(
        `${listToString(nouns)} ${joinWithVerb(nouns, 'is', 'are')} a light tiebreaker at most`,
      )
    }
  }

  if (ignoredFactors.length >= 3 && higherTierCount >= 3) {
    const nouns = ignoredFactors.map((f) => f.noun)
    sentences.push(
      `${listToString(nouns)} ${joinWithVerb(nouns, "isn't", "aren't")} factored into your score at all`,
    )
  }

  if (dailyImportantFactors.length > 0) {
    const nouns = dailyImportantFactors.map((f) => f.noun)
    sentences.push(
      `For day-to-day life, ${listToString(nouns)} ${joinWithVerb(nouns, 'is', 'are')} important to you`,
    )
  }

  if (dailyMinorFactors.length > 0) {
    const nouns = dailyMinorFactors.map((f) => f.noun)
    sentences.push(
      `${listToString(nouns)} ${joinWithVerb(nouns, 'is', 'are')} a mild daily preference`,
    )
  }

  const climateNote = climateAddendum(prefs)
  if (climateNote) sentences.push(climateNote)

  if (sentences.length === 0) {
    return capitalizeSentence(
      'Your priorities are evenly balanced — every factor carries moderate weight in your city scores',
    )
  }

  return joinSentences(sentences)
}
