import type { LifeEventInstance, LifeEventTypeCard } from '../../components/life-events/types'
import { LIFE_EVENT_CONFIGS } from '../../components/life-events/eventConfigs'
import {
  clampMortgagePayoffYear,
  getDefaultMortgagePayoffYear,
  normalizeMortgageLoanStartYear,
  normalizeMortgageLoanTermYears,
} from '../calc/mortgageLifeEvent'
import { EXPECTIFI_GROWTH_LIFE_EVENTS_KEY } from './keys'
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from './storageUtils'
import { canWriteExpectifiPlanBlobs } from './writeContext'

export const GROWTH_LIFE_EVENTS_VERSION = 3 as const

export type StoredGrowthLifeEvents = {
  version: typeof GROWTH_LIFE_EVENTS_VERSION
  cards: LifeEventTypeCard[]
}

const REMOVED_CONFIG_IDS = new Set([
  'charitable-giving',
  'church-tithe',
  'tuition-support',
  'job-loss',
  'early-retirement',
])

const CONFIG_IDS = LIFE_EVENT_CONFIGS.map((c) => c.id)

function newInstanceId(): string {
  return `lei-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
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

function str(raw: unknown, fallback = ''): string {
  return typeof raw === 'string' ? raw.trim() : fallback
}

function createDefaultInstance(
  configId: string,
  currentYear: number,
  retirementYear: number,
): LifeEventInstance {
  const config = LIFE_EVENT_CONFIGS.find((c) => c.id === configId)
  const defaultAmount = config?.defaultAmount ?? 10000
  const defaultYear = config?.defaultYear(currentYear, retirementYear) ?? currentYear + 1

  const instance: LifeEventInstance = {
    id: newInstanceId(),
    label: '',
    amount: defaultAmount,
    year: defaultYear,
    isExpanded: true,
  }

  if (configId === 'pay-off-mortgage' || configId === 'pay-student-loans') {
    instance.mortgageRate = 0.04
    instance.mortgageMonthlyPayment = 1500
    instance.mortgageLoanTermYears = 30
    instance.mortgageLoanStartYear = normalizeMortgageLoanStartYear(undefined, currentYear)
    instance.year = getDefaultMortgagePayoffYear(
      currentYear,
      retirementYear,
      instance.mortgageLoanTermYears,
      instance.mortgageLoanStartYear,
    )
  }

  if (configId === 'buy-vacation-property') {
    instance.downPayment = Math.round(defaultAmount * 0.2)
    instance.mortgageRate = 0.065
    instance.mortgageLoanTermYears = 30
  }

  if (configId === 'fund-529') {
    instance.plan529GrowthRate = 0.06
  }

  if (configId === 'business-investment') {
    instance.expectedReturn = 0.12
    instance.timelineYears = 7
  }

  if (configId === 'divorce') {
    instance.divorceIsPercent = true
    instance.divorcePercent = 50
  }

  if (configId === 'inheritance') {
    instance.investedAccount = 'brokerage'
  }

  if (configId === 'sell-business' || configId === 'sell-property') {
    instance.taxRate = 0.2
  }

  if (configId === 'pension-lump-sum') {
    instance.taxWithholding = 0.22
  }

  return instance
}

function createDefaultCard(
  configId: string,
  currentYear: number,
  retirementYear: number,
): LifeEventTypeCard {
  return {
    configId,
    isActive: false,
    isExpanded: false,
    instances: [createDefaultInstance(configId, currentYear, retirementYear)],
  }
}

function normalizeInstance(
  raw: unknown,
  configId: string,
  currentYear: number,
  retirementYear: number,
): LifeEventInstance {
  const base = createDefaultInstance(configId, currentYear, retirementYear)
  if (!raw || typeof raw !== 'object') return base

  const o = raw as Record<string, unknown>
  const instance: LifeEventInstance = {
    ...base,
    id: str(o.id) || base.id,
    label: str(o.label),
    amount: Math.max(0, num(o.amount, base.amount)),
    year: num(o.year, base.year),
    isExpanded: bool(o.isExpanded, base.isExpanded),
    pendingDelete: bool(o.pendingDelete, false) || undefined,
    financingEnabled: bool(o.financingEnabled, false) || undefined,
    loanAmount: num(o.loanAmount, base.loanAmount ?? 0) || undefined,
    loanRate: num(o.loanRate, base.loanRate ?? 0.06) || undefined,
    loanTermYears: num(o.loanTermYears, base.loanTermYears ?? 5) || undefined,
    financedAmount: num(o.financedAmount, base.financedAmount ?? 0) || undefined,
    mortgageRate: num(o.mortgageRate, base.mortgageRate ?? 0.04),
    mortgageMonthlyPayment: num(o.mortgageMonthlyPayment, base.mortgageMonthlyPayment ?? 1500),
    mortgageLoanTermYears: normalizeMortgageLoanTermYears(
      o.mortgageLoanTermYears ?? base.mortgageLoanTermYears,
    ),
    mortgageLoanStartYear: normalizeMortgageLoanStartYear(
      o.mortgageLoanStartYear ?? base.mortgageLoanStartYear,
      currentYear,
    ),
    downPayment: num(o.downPayment, base.downPayment ?? 0) || undefined,
    hsaOffsetAmount:
      o.hsaOffsetAmount != null ? Math.max(0, num(o.hsaOffsetAmount, 0)) : undefined,
    plan529GrowthRate: num(o.plan529GrowthRate, base.plan529GrowthRate ?? 0.06),
    expectedReturn: num(o.expectedReturn, base.expectedReturn ?? 0.12),
    timelineYears: Math.max(1, Math.round(num(o.timelineYears, base.timelineYears ?? 7))),
    description: str(o.description) || undefined,
    divorceIsPercent: bool(o.divorceIsPercent, base.divorceIsPercent ?? true),
    divorcePercent: num(o.divorcePercent, base.divorcePercent ?? 50),
    investedAccount: str(o.investedAccount, base.investedAccount ?? 'brokerage') || 'brokerage',
    taxRate: num(o.taxRate, base.taxRate ?? 0.2),
    taxWithholding: num(o.taxWithholding, base.taxWithholding ?? 0.22),
  }

  if (configId === 'pay-off-mortgage' || configId === 'pay-student-loans') {
    instance.year = clampMortgagePayoffYear(
      instance.year,
      currentYear,
      retirementYear,
      instance.mortgageLoanTermYears ?? 30,
      instance.mortgageLoanStartYear ?? currentYear,
    )
  } else {
    instance.year = clampYear(instance.year, currentYear, retirementYear)
  }

  return instance
}

function normalizeCard(
  raw: unknown,
  configId: string,
  currentYear: number,
  retirementYear: number,
): LifeEventTypeCard {
  const base = createDefaultCard(configId, currentYear, retirementYear)
  if (!raw || typeof raw !== 'object') return base

  const o = raw as Record<string, unknown>
  const rawInstances = Array.isArray(o.instances) ? o.instances : []
  const instances =
    rawInstances.length > 0
      ? rawInstances.map((inst) => normalizeInstance(inst, configId, currentYear, retirementYear))
      : base.instances

  return {
    configId,
    isActive: bool(o.isActive, base.isActive),
    isExpanded: bool(o.isExpanded, base.isExpanded),
    instances,
  }
}

function migrateV1Events(
  rawEvents: unknown[],
  currentYear: number,
  retirementYear: number,
): LifeEventTypeCard[] {
  const byConfig = new Map<string, unknown[]>()

  for (const entry of rawEvents) {
    if (!entry || typeof entry !== 'object') continue
    const o = entry as Record<string, unknown>
    const configId = str(o.configId)
    if (!configId || REMOVED_CONFIG_IDS.has(configId)) continue
    if (!CONFIG_IDS.includes(configId)) continue
    const list = byConfig.get(configId) ?? []
    list.push(entry)
    byConfig.set(configId, list)
  }

  return CONFIG_IDS.map((configId) => {
    const entries = byConfig.get(configId)
    if (!entries?.length) {
      return createDefaultCard(configId, currentYear, retirementYear)
    }

    const first = entries[0] as Record<string, unknown>
    const instances = entries.map((entry) => {
      const e = entry as Record<string, unknown>
      return normalizeInstance(
        {
          ...e,
          label: e.label ?? '',
          isExpanded: e.isExpanded ?? false,
        },
        configId,
        currentYear,
        retirementYear,
      )
    })

    return {
      configId,
      isActive: entries.some((e) => bool((e as Record<string, unknown>).isActive, false)),
      isExpanded: bool(first.isExpanded, false),
      instances,
    }
  })
}

export function buildDefaultGrowthLifeEvents(
  currentYear = new Date().getFullYear(),
  retirementYear = currentYear + 30,
): LifeEventTypeCard[] {
  return CONFIG_IDS.map((configId) => createDefaultCard(configId, currentYear, retirementYear))
}

export function normalizeStoredGrowthLifeEvents(
  raw: unknown,
  currentYear = new Date().getFullYear(),
  retirementYear = currentYear + 30,
): StoredGrowthLifeEvents {
  const base = buildDefaultGrowthLifeEvents(currentYear, retirementYear)

  if (!raw || typeof raw !== 'object') {
    return { version: GROWTH_LIFE_EVENTS_VERSION, cards: base }
  }

  const o = raw as Record<string, unknown>
  const version = num(o.version, 1)

  if (version >= 3 && Array.isArray(o.cards)) {
    const cards = CONFIG_IDS.map((configId, i) => {
      const match = (o.cards as unknown[]).find(
        (c) =>
          c &&
          typeof c === 'object' &&
          (c as Record<string, unknown>).configId === configId,
      )
      return normalizeCard(match ?? base[i], configId, currentYear, retirementYear)
    })
    return { version: GROWTH_LIFE_EVENTS_VERSION, cards }
  }

  if (Array.isArray(o.events)) {
    return {
      version: GROWTH_LIFE_EVENTS_VERSION,
      cards: migrateV1Events(o.events, currentYear, retirementYear),
    }
  }

  return { version: GROWTH_LIFE_EVENTS_VERSION, cards: base }
}

export function loadGrowthLifeEvents(
  currentYear = new Date().getFullYear(),
  retirementYear = currentYear + 30,
): LifeEventTypeCard[] {
  const raw = readJsonFromLocalStorage<unknown>(EXPECTIFI_GROWTH_LIFE_EVENTS_KEY)
  return normalizeStoredGrowthLifeEvents(raw, currentYear, retirementYear).cards
}

export function saveGrowthLifeEvents(
  cards: LifeEventTypeCard[],
  currentYear = new Date().getFullYear(),
  retirementYear = currentYear + 30,
): LifeEventTypeCard[] {
  const normalized = normalizeStoredGrowthLifeEvents(
    { version: GROWTH_LIFE_EVENTS_VERSION, cards },
    currentYear,
    retirementYear,
  )
  if (canWriteExpectifiPlanBlobs()) {
    writeJsonToLocalStorage(EXPECTIFI_GROWTH_LIFE_EVENTS_KEY, normalized)
    void import('../planStateServerSync').then(({ queuePlanStateServerSync }) => {
      queuePlanStateServerSync()
    })
  }
  return normalized.cards
}

export function growthLifeEventsHaveCustomizations(cards: LifeEventTypeCard[]): boolean {
  return cards.some((c) => c.isActive)
}

export function createLifeEventInstance(
  configId: string,
  currentYear: number,
  retirementYear: number,
): LifeEventInstance {
  return createDefaultInstance(configId, currentYear, retirementYear)
}
