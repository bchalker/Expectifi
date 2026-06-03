import { EXPECTIFI_LIFE_PLANS_KEY } from './keys'
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from './storageUtils'
import { canWriteExpectifiPlanBlobs } from './writeContext'

export const LIFE_PLANS_VERSION = 1 as const

export type SellPlanOption = 'Yes' | 'Maybe' | 'No'
export type InheritanceExpectation = 'Yes' | 'Possibly' | 'No'
export type HomeOwnershipStatus = 'rent' | 'mortgage' | 'own'

export type LifePlansHousing = {
  ownership: HomeOwnershipStatus
  mortgageBalance: number
  mortgagePayoffYear: number
  planToSell: SellPlanOption
  sellYear: number
  saleProceeds: number
}

export type LifePlansFamily = {
  married: boolean
  hasChildren: boolean
  dependentCount: number
  dependentAges: number[]
  supportingParent: boolean
  parentSupportAmount: number
  parentSupportYears: number
}

export type LifePlansVehicles = {
  count: number
  oldestYear: number
}

export type LifePlansOther = {
  hasRental: boolean
  rentalIncome: number
  rentalStartYear: number
  expectsInheritance: InheritanceExpectation
  inheritanceAmount: number
  inheritanceYear: number
  tithes: boolean
  titheAmount: number
}

export type LifePlans = {
  version: typeof LIFE_PLANS_VERSION
  housing: LifePlansHousing
  family: LifePlansFamily
  vehicles: LifePlansVehicles
  other: LifePlansOther
}

/** Full plans object — Life tab data lives under `life`. */
export type ExpectifiPlans = {
  life: LifePlans
}

export function defaultLifePlans(currentYear: number = new Date().getFullYear()): LifePlans {
  return {
    version: LIFE_PLANS_VERSION,
    housing: {
      ownership: 'own',
      mortgageBalance: 0,
      mortgagePayoffYear: currentYear + 5,
      planToSell: 'Maybe',
      sellYear: currentYear + 10,
      saleProceeds: 0,
    },
    family: {
      married: false,
      hasChildren: false,
      dependentCount: 0,
      dependentAges: [],
      supportingParent: false,
      parentSupportAmount: 0,
      parentSupportYears: 5,
    },
    vehicles: {
      count: 0,
      oldestYear: currentYear - 10,
    },
    other: {
      hasRental: false,
      rentalIncome: 0,
      rentalStartYear: currentYear + 1,
      expectsInheritance: 'No',
      inheritanceAmount: 0,
      inheritanceYear: currentYear + 5,
      tithes: false,
      titheAmount: 0,
    },
  }
}

function parseDependentAges(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : NaN))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 120)
}

function normalizeSellPlan(raw: unknown): SellPlanOption {
  if (raw === 'Yes' || raw === 'Maybe' || raw === 'No') return raw
  return 'Maybe'
}

function normalizeInheritance(raw: unknown): InheritanceExpectation {
  if (raw === 'Yes' || raw === 'Possibly' || raw === 'No') return raw
  return 'No'
}

function num(raw: unknown, fallback = 0): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback
}

function bool(raw: unknown, fallback = false): boolean {
  return typeof raw === 'boolean' ? raw : fallback
}

function normalizeOwnership(
  h: Record<string, unknown>,
  fallback: HomeOwnershipStatus,
): HomeOwnershipStatus {
  if (h.ownership === 'rent' || h.ownership === 'mortgage' || h.ownership === 'own') {
    return h.ownership
  }
  const owns = bool(h.owns, fallback !== 'rent')
  if (!owns) return 'rent'
  const paidOff =
    typeof h.mortgageFullyPaidOff === 'boolean'
      ? h.mortgageFullyPaidOff
      : num(h.mortgageBalance) <= 0
  return paidOff ? 'own' : 'mortgage'
}

export function normalizeLifePlans(raw: unknown, currentYear = new Date().getFullYear()): LifePlans {
  const base = defaultLifePlans(currentYear)
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  const h = o.housing && typeof o.housing === 'object' ? (o.housing as Record<string, unknown>) : {}
  const f = o.family && typeof o.family === 'object' ? (o.family as Record<string, unknown>) : {}
  const v = o.vehicles && typeof o.vehicles === 'object' ? (o.vehicles as Record<string, unknown>) : {}
  const ot = o.other && typeof o.other === 'object' ? (o.other as Record<string, unknown>) : {}
  const ownership = normalizeOwnership(h, base.housing.ownership)
  const mortgageBalance =
    ownership === 'mortgage' ? Math.max(0, num(h.mortgageBalance)) : 0
  return {
    version: LIFE_PLANS_VERSION,
    housing: {
      ownership,
      mortgageBalance,
      mortgagePayoffYear: num(h.mortgagePayoffYear, base.housing.mortgagePayoffYear),
      planToSell: normalizeSellPlan(h.planToSell),
      sellYear: num(h.sellYear, base.housing.sellYear),
      saleProceeds: Math.max(0, num(h.saleProceeds)),
    },
    family: {
      married: bool(f.married),
      hasChildren: bool(f.hasChildren),
      dependentCount: Math.max(0, Math.min(10, Math.round(num(f.dependentCount)))),
      dependentAges: parseDependentAges(f.dependentAges),
      supportingParent: bool(f.supportingParent),
      parentSupportAmount: Math.max(0, num(f.parentSupportAmount)),
      parentSupportYears: Math.max(1, Math.min(20, Math.round(num(f.parentSupportYears, 5)))),
    },
    vehicles: {
      count: Math.max(0, Math.min(6, Math.round(num(v.count)))),
      oldestYear: num(v.oldestYear, base.vehicles.oldestYear),
    },
    other: {
      hasRental: bool(ot.hasRental),
      rentalIncome: Math.max(0, num(ot.rentalIncome)),
      rentalStartYear: num(ot.rentalStartYear, base.other.rentalStartYear),
      expectsInheritance: normalizeInheritance(ot.expectsInheritance),
      inheritanceAmount: Math.max(0, num(ot.inheritanceAmount)),
      inheritanceYear: num(ot.inheritanceYear, base.other.inheritanceYear),
      tithes: bool(ot.tithes),
      titheAmount: Math.max(0, num(ot.titheAmount)),
    },
  }
}

export function loadLifePlans(currentYear = new Date().getFullYear()): LifePlans {
  const raw = readJsonFromLocalStorage<unknown>(EXPECTIFI_LIFE_PLANS_KEY)
  return normalizeLifePlans(raw, currentYear)
}

export function saveLifePlans(patch: Partial<LifePlans>): LifePlans {
  const current = loadLifePlans()
  const next = normalizeLifePlans({
    ...current,
    ...patch,
    housing: { ...current.housing, ...patch.housing },
    family: { ...current.family, ...patch.family },
    vehicles: { ...current.vehicles, ...patch.vehicles },
    other: { ...current.other, ...patch.other },
  })
  if (canWriteExpectifiPlanBlobs()) {
    writeJsonToLocalStorage(EXPECTIFI_LIFE_PLANS_KEY, next)
  }
  return next
}

export function loadExpectifiPlans(currentYear = new Date().getFullYear()): ExpectifiPlans {
  return { life: loadLifePlans(currentYear) }
}
