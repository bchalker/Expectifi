import type { LifeEventState } from '../../components/life-events/types'
import {
  clampMortgagePayoffYear,
  getDefaultMortgagePayoffYear,
  normalizeMortgageLoanStartYear,
  normalizeMortgageLoanTermYears,
} from '../calc/mortgageLifeEvent'
import { EXPECTIFI_GROWTH_LIFE_EVENTS_KEY } from './keys'
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from './storageUtils'
import { canWriteExpectifiPlanBlobs } from './writeContext'

export const GROWTH_LIFE_EVENTS_VERSION = 1 as const

export type StoredGrowthLifeEvents = {
  version: typeof GROWTH_LIFE_EVENTS_VERSION
  events: LifeEventState[]
}

const KNOWN_CONFIG_IDS = [
  'buy-car-cash',
  'pay-off-mortgage',
  'home-renovation',
  'medical-expense',
  'tuition-support',
  'charitable-giving',
  'church-tithe',
] as const

type KnownConfigId = (typeof KNOWN_CONFIG_IDS)[number]

const DEFAULT_SEEDS: Record<
  KnownConfigId,
  { amount: number; yearOffset: number; duration?: number }
> = {
  'buy-car-cash': { amount: 35000, yearOffset: 1 },
  'pay-off-mortgage': { amount: 85000, yearOffset: 2 },
  'home-renovation': { amount: 45000, yearOffset: 1 },
  'medical-expense': { amount: 25000, yearOffset: 1 },
  'tuition-support': { amount: 600, yearOffset: 2, duration: 4 },
  'charitable-giving': { amount: 400, yearOffset: 0, duration: 20 },
  'church-tithe': { amount: 500, yearOffset: 0, duration: 25 },
}

function stableEventId(configId: KnownConfigId): string {
  return `growth-life-event-${configId}`
}

function clampYear(year: number, currentYear: number, retirementYear: number): number {
  const maxYear = Math.max(currentYear, retirementYear)
  return Math.min(Math.max(Math.round(year), currentYear), maxYear)
}

function num(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback
}

function bool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === 'boolean' ? raw : fallback
}

function normalizeEvent(
  raw: unknown,
  configId: KnownConfigId,
  currentYear: number,
  retirementYear: number,
): LifeEventState {
  const seed = DEFAULT_SEEDS[configId]
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const amount = Math.max(0, num(o.amount, seed.amount))
  const state: LifeEventState = {
    id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : stableEventId(configId),
    configId,
    amount,
    year: currentYear,
    isActive: bool(o.isActive, false),
    isExpanded: bool(o.isExpanded, false),
  }
  if (typeof o.label === 'string' && o.label.trim()) {
    state.label = o.label.trim()
  }
  if (seed.duration != null) {
    state.duration = Math.max(1, Math.round(num(o.duration, seed.duration)))
  }
  if (configId === 'pay-off-mortgage') {
    const rate = num(o.mortgageRate, 0.04)
    state.mortgageRate = Math.min(0.1, Math.max(0.005, rate))
    state.mortgageMonthlyPayment = Math.min(
      5000,
      Math.max(500, Math.round(num(o.mortgageMonthlyPayment, 1500))),
    )
    state.mortgageLoanTermYears = normalizeMortgageLoanTermYears(o.mortgageLoanTermYears)
    state.mortgageLoanStartYear = normalizeMortgageLoanStartYear(o.mortgageLoanStartYear, currentYear)
    const defaultPayoffYear = getDefaultMortgagePayoffYear(
      currentYear,
      retirementYear,
      state.mortgageLoanTermYears,
      state.mortgageLoanStartYear,
    )
    state.year = clampMortgagePayoffYear(
      num(o.year, defaultPayoffYear),
      currentYear,
      retirementYear,
      state.mortgageLoanTermYears,
      state.mortgageLoanStartYear,
    )
  } else {
    const defaultYear = clampYear(currentYear + seed.yearOffset, currentYear, retirementYear)
    state.year = clampYear(num(o.year, defaultYear), currentYear, retirementYear)
  }
  return state
}

export function buildDefaultGrowthLifeEvents(
  currentYear = new Date().getFullYear(),
  retirementYear = currentYear + 30,
): LifeEventState[] {
  return KNOWN_CONFIG_IDS.map((configId) =>
    normalizeEvent(null, configId, currentYear, retirementYear),
  )
}

export function normalizeStoredGrowthLifeEvents(
  raw: unknown,
  currentYear = new Date().getFullYear(),
  retirementYear = currentYear + 30,
): StoredGrowthLifeEvents {
  const base = buildDefaultGrowthLifeEvents(currentYear, retirementYear)
  if (!raw || typeof raw !== 'object') {
    return { version: GROWTH_LIFE_EVENTS_VERSION, events: base }
  }
  const o = raw as Record<string, unknown>
  const rawEvents = Array.isArray(o.events) ? o.events : []
  const byConfigId = new Map<string, unknown>()
  for (const entry of rawEvents) {
    if (!entry || typeof entry !== 'object') continue
    const configId = (entry as Record<string, unknown>).configId
    if (typeof configId === 'string') byConfigId.set(configId, entry)
  }
  const events = KNOWN_CONFIG_IDS.map((configId) =>
    normalizeEvent(byConfigId.get(configId), configId, currentYear, retirementYear),
  )
  return { version: GROWTH_LIFE_EVENTS_VERSION, events }
}

export function loadGrowthLifeEvents(
  currentYear = new Date().getFullYear(),
  retirementYear = currentYear + 30,
): LifeEventState[] {
  const raw = readJsonFromLocalStorage<unknown>(EXPECTIFI_GROWTH_LIFE_EVENTS_KEY)
  return normalizeStoredGrowthLifeEvents(raw, currentYear, retirementYear).events
}

export function saveGrowthLifeEvents(
  events: LifeEventState[],
  currentYear = new Date().getFullYear(),
  retirementYear = currentYear + 30,
): LifeEventState[] {
  const normalized = normalizeStoredGrowthLifeEvents(
    { version: GROWTH_LIFE_EVENTS_VERSION, events },
    currentYear,
    retirementYear,
  )
  if (canWriteExpectifiPlanBlobs()) {
    writeJsonToLocalStorage(EXPECTIFI_GROWTH_LIFE_EVENTS_KEY, normalized)
    void import('../planStateServerSync').then(({ queuePlanStateServerSync }) => {
      queuePlanStateServerSync()
    })
  }
  return normalized.events
}

export function growthLifeEventsHaveCustomizations(events: LifeEventState[]): boolean {
  return events.some((e) => e.isActive)
}
