import type { AccountScenarioBucketId } from './accountReturnScenario'
import { getAccountTypeMeta } from './manualAccountEntries'
import type { ManualAccountEntry, OnboardingAccountType } from './manualAccountEntries'
import type { OutlookScenarioChoice } from './holdingScenarioApply'
import { positionsForTaxTreatment, type ImportedPositionRow } from './positionsCsv'

export type AllocationProfile =
  | 'conservative'
  | 'moderate'
  | 'aggressive'
  | 'all_equities'

export type AccountDataSource = 'manual' | 'csv' | 'plaid'

/** Dashboard slider stops — conservative (0) through aggressive (3). */
export const ALLOCATION_PROFILE_SLIDER_STOPS: readonly {
  id: AllocationProfile
  label: string
  mixHint: string
}[] = [
  {
    id: 'conservative',
    label: 'Mostly bonds or cash',
    mixHint: '~20% equities / 80% bonds',
  },
  {
    id: 'moderate',
    label: 'Stocks and bonds',
    mixHint: '~60% equities / 40% bonds',
  },
  {
    id: 'aggressive',
    label: 'Mostly stocks',
    mixHint: '~80% equities / 20% bonds',
  },
  {
    id: 'all_equities',
    label: 'All equities',
    mixHint: '~100% equities',
  },
] as const

export const ALLOCATION_PROFILE_SLIDER_MIN = 0
export const ALLOCATION_PROFILE_SLIDER_MAX = ALLOCATION_PROFILE_SLIDER_STOPS.length - 1
export const ALLOCATION_PROFILE_SLIDER_DEFAULT_STOP = 1

/** Equity % at each slider stop — used to interpolate while dragging. */
const SLIDER_EQUITY_PCT_BY_STOP = [20, 60, 80, 100] as const

export function clampAllocationSliderPosition(position: number): number {
  return Math.max(
    ALLOCATION_PROFILE_SLIDER_MIN,
    Math.min(ALLOCATION_PROFILE_SLIDER_MAX, position),
  )
}

export function interpolatedEquityPct(position: number): number {
  const t = clampAllocationSliderPosition(position)
  const lower = Math.floor(t)
  const upper = Math.ceil(t)
  if (lower === upper) return SLIDER_EQUITY_PCT_BY_STOP[lower]!
  const frac = t - lower
  const low = SLIDER_EQUITY_PCT_BY_STOP[lower]!
  const high = SLIDER_EQUITY_PCT_BY_STOP[upper]!
  return Math.round(low + (high - low) * frac)
}

/** Compact mix line for account row trigger (updates while sliding). */
export function interpolatedMixHint(position: number): string {
  const eq = interpolatedEquityPct(position)
  const bonds = 100 - eq
  if (bonds <= 0) return `${eq}% equities`
  return `${eq}% equities/${bonds}% bonds`
}

/** Color tier for allocation label + active trigger inset (conservative → aggressive). */
export type AllocationProfileTone = AllocationProfile

export function allocationProfileToneAtEquityPct(equityPct: number): AllocationProfileTone {
  if (equityPct >= 90) return 'all_equities'
  if (equityPct >= 70) return 'aggressive'
  if (equityPct >= 40) return 'moderate'
  return 'conservative'
}

export function allocationProfileToneAtPosition(position: number): AllocationProfileTone {
  return allocationProfileToneAtEquityPct(interpolatedEquityPct(position))
}

/** Human-readable label from interpolated equity % (updates while sliding). */
export function allocationProfileLabelAtEquityPct(equityPct: number): string {
  if (equityPct >= 90) return 'All Equities'
  if (equityPct >= 70) return 'Mostly Stocks'
  if (equityPct >= 40) return 'Stocks and Bonds'
  return 'Mostly Bonds or Cash'
}

/** Label and mix hint both follow continuous slider position. */
export function allocationProfileDisplayAtPosition(position: number): {
  label: string
  mixHint: string
  tone: AllocationProfileTone
} {
  const eq = interpolatedEquityPct(position)
  return {
    label: allocationProfileLabelAtEquityPct(eq),
    mixHint: interpolatedMixHint(position),
    tone: allocationProfileToneAtEquityPct(eq),
  }
}

/** Mix line from a stored equity % (no snap to preset stops). */
export function allocationProfileDisplayAtEquityPct(equityPct: number): {
  label: string
  mixHint: string
  tone: AllocationProfileTone
} {
  const eq = Math.max(0, Math.min(100, Math.round(equityPct)))
  const bonds = 100 - eq
  return {
    label: allocationProfileLabelAtEquityPct(eq),
    mixHint: bonds <= 0 ? `${eq}% equities` : `${eq}% equities/${bonds}% bonds`,
    tone: allocationProfileToneAtEquityPct(eq),
  }
}

/** Inverse of {@link interpolatedEquityPct} — restores continuous slider position. */
export function sliderPositionForEquityPct(equityPct: number): number {
  const eq = Math.max(0, Math.min(100, Math.round(equityPct)))
  if (eq <= SLIDER_EQUITY_PCT_BY_STOP[0]!) return ALLOCATION_PROFILE_SLIDER_MIN
  if (eq >= SLIDER_EQUITY_PCT_BY_STOP[SLIDER_EQUITY_PCT_BY_STOP.length - 1]!) {
    return ALLOCATION_PROFILE_SLIDER_MAX
  }
  for (let i = 0; i < SLIDER_EQUITY_PCT_BY_STOP.length - 1; i++) {
    const low = SLIDER_EQUITY_PCT_BY_STOP[i]!
    const high = SLIDER_EQUITY_PCT_BY_STOP[i + 1]!
    if (eq < low || eq > high) continue
    if (high === low) return i
    return i + (eq - low) / (high - low)
  }
  return ALLOCATION_PROFILE_SLIDER_DEFAULT_STOP
}

export function allocationProfileForEquityPct(equityPct: number): AllocationProfile {
  return allocationProfileToneAtEquityPct(equityPct)
}

/** Slider thumb + trigger display from stored profile and/or equity %. */
export function resolveAllocationSliderState(
  profile: AllocationProfile | null | undefined,
  equityPct?: number | null,
): { position: number; equityPct: number; profile: AllocationProfile } {
  if (equityPct != null && Number.isFinite(equityPct)) {
    const eq = Math.max(0, Math.min(100, Math.round(equityPct)))
    return {
      position: sliderPositionForEquityPct(eq),
      equityPct: eq,
      profile: allocationProfileForEquityPct(eq),
    }
  }
  const position = sliderStopForAllocationProfile(profile)
  const eq = interpolatedEquityPct(position)
  return {
    position,
    equityPct: eq,
    profile: profile ?? allocationProfileForEquityPct(eq),
  }
}

export function snapAllocationSliderStop(position: number): number {
  return Math.max(
    ALLOCATION_PROFILE_SLIDER_MIN,
    Math.min(ALLOCATION_PROFILE_SLIDER_MAX, Math.round(position)),
  )
}

export function allocationProfileForSliderStop(stop: number): AllocationProfile {
  return ALLOCATION_PROFILE_SLIDER_STOPS[snapAllocationSliderStop(stop)]!.id
}

/** Visual stop when unset defaults to Stocks and bonds (stop 1). */
export function sliderStopForAllocationProfile(
  profile: AllocationProfile | null | undefined,
): number {
  if (profile == null) return ALLOCATION_PROFILE_SLIDER_DEFAULT_STOP
  const idx = ALLOCATION_PROFILE_SLIDER_STOPS.findIndex((s) => s.id === profile)
  return idx >= 0 ? idx : ALLOCATION_PROFILE_SLIDER_DEFAULT_STOP
}

export function allocationProfileSliderMeta(stop: number) {
  const clamped = Math.max(
    ALLOCATION_PROFILE_SLIDER_MIN,
    Math.min(ALLOCATION_PROFILE_SLIDER_MAX, Math.round(stop)),
  )
  return ALLOCATION_PROFILE_SLIDER_STOPS[clamped]!
}

/** Short label on the account row helper line. */
export function allocationProfileRowHelperLabel(
  profile: AllocationProfile | null | undefined,
): string {
  if (profile === 'aggressive') return 'Mostly stocks'
  if (profile === 'moderate') return 'Stocks and bonds'
  if (profile === 'conservative') return 'Mostly bonds or cash'
  if (profile === 'all_equities') return 'All equities'
  return 'No allocation profile set'
}

export const INLINE_ALLOCATION_PROFILE_CARDS: readonly {
  id: AllocationProfile
  title: string
  description: string
}[] = [
  {
    id: 'aggressive',
    title: 'Mostly stocks',
    description:
      'Higher growth potential, higher short-term volatility. Scenario ranges reflect equity-level return assumptions.',
  },
  {
    id: 'moderate',
    title: 'Stocks and bonds',
    description: 'Balanced growth and stability. Ranges reflect a blended portfolio.',
  },
  {
    id: 'conservative',
    title: 'Mostly bonds or cash',
    description:
      'Lower volatility, steadier but slower growth. Bullish scenarios may overstate your actual upside.',
  },
  {
    id: 'all_equities',
    title: 'All equities',
    description: 'Maximum equity exposure. Scenario ranges assume a fully invested stock portfolio.',
  },
] as const

export const ALLOCATION_PROFILE_OPTIONS: readonly {
  id: AllocationProfile
  title: string
  description: string
}[] = [
  {
    id: 'aggressive',
    title: 'Mostly stocks',
    description: 'Higher growth potential, higher volatility',
  },
  {
    id: 'moderate',
    title: 'Stocks and bonds',
    description: 'Balanced growth and stability',
  },
  {
    id: 'conservative',
    title: 'Mostly bonds or cash',
    description: 'Lower volatility, steadier returns',
  },
  {
    id: 'all_equities',
    title: 'All equities',
    description: 'Fully invested in stocks',
  },
] as const

const PROFILE_DISCLOSURE_PHRASE: Record<AllocationProfile, string> = {
  aggressive: 'mostly stocks',
  moderate: 'stocks and bonds',
  conservative: 'mostly bonds or cash',
  all_equities: 'all-equity',
}

export function allocationProfileDisclosurePhrase(profile: AllocationProfile): string {
  return PROFILE_DISCLOSURE_PHRASE[profile]
}

/** Single contextual line for manual account scenario drawer (replaces holdings + disclosure stack). */
export function accountScenarioManualHeaderNote(
  allocationProfile: AllocationProfile | null | undefined,
): string {
  if (allocationProfile) {
    return `Scenario ranges are calibrated for a ${allocationProfileDisclosurePhrase(allocationProfile)} portfolio.`
  }
  return 'No allocation profile set. Ranges assume a broadly diversified equity portfolio.'
}

export function manualEntryIdForScenarioBucket(
  entries: ManualAccountEntry[],
  bucket: AccountScenarioBucketId,
): string | null {
  const match = entries.find(
    (e) => e.type != null && e.balance > 0 && bucketForEntryType(e.type) === bucket,
  )
  return match?.id ?? null
}

export function scenarioAllocationMismatchNote(
  allocationProfile: AllocationProfile | null | undefined,
  outlookChoice: OutlookScenarioChoice | null,
): string | null {
  if (!allocationProfile || !outlookChoice) return null
  if (
    allocationProfile === 'conservative' &&
    (outlookChoice === 'bull' || outlookChoice === 'very_bull')
  ) {
    return 'This scenario assumes equity-level returns. Your allocation profile leans conservative — results may be optimistic.'
  }
  if (
    (allocationProfile === 'aggressive' || allocationProfile === 'all_equities') &&
    (outlookChoice === 'bear' || outlookChoice === 'very_bear')
  ) {
    return 'This scenario assumes equity-level stress. Your allocation profile leans toward stocks — results may be pessimistic.'
  }
  return null
}

function bucketForEntryType(type: OnboardingAccountType): AccountScenarioBucketId {
  return getAccountTypeMeta(type).withdrawalBucket
}

export function allocationProfileForManualBucket(
  entries: ManualAccountEntry[],
  bucket: AccountScenarioBucketId,
): AllocationProfile | null {
  const profiles = entries
    .filter((e) => e.type != null && e.balance > 0 && bucketForEntryType(e.type) === bucket)
    .map((e) => e.allocation_profile)
    .filter((p): p is AllocationProfile => p != null)
  if (profiles.length === 0) return null
  const unique = new Set(profiles)
  return unique.size === 1 ? profiles[0]! : null
}

export function accountScenarioContextForBucket(opts: {
  bucket: AccountScenarioBucketId
  balanceMode: 'manual' | 'imported'
  manualEntries: ManualAccountEntry[]
  importedPositionRows: ImportedPositionRow[]
}): { source: AccountDataSource | null; allocationProfile: AllocationProfile | null } {
  const { bucket, balanceMode, manualEntries, importedPositionRows } = opts
  const holdings = positionsForTaxTreatment(importedPositionRows, bucket)

  if (balanceMode === 'imported' && holdings.length > 0) {
    const plaid = holdings.some((r) => r.brokerSource === 'plaid')
    return { source: plaid ? 'plaid' : 'csv', allocationProfile: null }
  }

  if (balanceMode === 'manual' || manualEntries.length > 0) {
    return {
      source: 'manual',
      allocationProfile: allocationProfileForManualBucket(manualEntries, bucket),
    }
  }

  return { source: null, allocationProfile: null }
}
