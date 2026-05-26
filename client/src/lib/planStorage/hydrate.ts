import { buildSnapshot } from '../appSnapshot'
import {
  defaultCalculatorInputs,
  defaultCalculatorUi,
} from '../initialCalculatorInputs'
import { applyFidelityBalanceOverrides } from '../portfolioSourceExclusivity'
import type { CalculatorInputs, CalculatorUi } from '../computeResults'
import {
  aggregateManualAccountsToBases,
  type StoredManualAccounts,
} from '../manualAccountEntries'
import { isSessionOnboardingComplete } from '../sessionFlags'
import { profileToCalculatorPatch } from '../userProfileStorage'
import { loadPlanAccounts, planAccountsHaveBalances } from './accounts'
import { loadMeta } from './meta'
import { migrateLegacyPlanStorageIfNeeded } from './migrateLegacy'
import { loadPlanProfile, profileHasOnboardingComplete } from './profile'
import { hydratePlanSession, loadPlanSession } from './session'
import { resolveUserTier } from './resolveTier'
import type { AuthTierInput } from './types'
import type { PlanHydration, StoredPlanProfile, UserTier } from './types'

export type HydratePlanOptions = {
  auth: AuthTierInput
  defaultInputs?: CalculatorInputs
  defaultUi?: CalculatorUi
}

function mergeManualAccountsIntoInputs(
  inputs: CalculatorInputs,
  accounts: StoredManualAccounts | null,
): CalculatorInputs {
  if (!accounts?.onboardingCompleted) return inputs
  const bases = aggregateManualAccountsToBases(accounts.entries)
  return {
    ...inputs,
    base401k: bases.base401k,
    baseSE401k: bases.baseSE401k,
    baseTradIRA: bases.baseTradIRA,
    baseRoth: bases.baseRoth,
    baseHsa: bases.baseHsa,
    brkBal: bases.brkBal,
  }
}

function resolveOnboardingComplete(
  tier: UserTier,
  profile: StoredPlanProfile | null,
  accounts: StoredManualAccounts | null,
): boolean {
  if (tier === 'pro' || tier === 'authenticated_free') {
    return profileHasOnboardingComplete(profile) || planAccountsHaveBalances(accounts)
  }
  if (tier === 'browser_saved') {
    return profileHasOnboardingComplete(profile)
  }
  return isSessionOnboardingComplete()
}

export function createDefaultPlanHydration(): PlanHydration {
  return {
    tier: 'anonymous',
    inputs: { ...defaultCalculatorInputs },
    ui: { ...defaultCalculatorUi },
    phase: 'growth',
    activePreset: null,
    onboardingComplete: false,
    profile: null,
    accounts: null,
  }
}

function hydratePlanStateForTier(
  tier: UserTier,
  options?: Pick<HydratePlanOptions, 'defaultInputs' | 'defaultUi'>,
): PlanHydration {
  const defaultInputs = options?.defaultInputs ?? defaultCalculatorInputs
  const defaultUi = options?.defaultUi ?? defaultCalculatorUi

  const profile = loadPlanProfile()
  const accounts = loadPlanAccounts()
  const sessionRaw = loadPlanSession()
  const session = hydratePlanSession(sessionRaw, defaultInputs)

  let inputs: CalculatorInputs = { ...defaultInputs }
  let ui: CalculatorUi = { ...defaultUi }
  let phase: 'growth' | 'income' = 'growth'
  let activePreset: string | null = null

  if (tier === 'browser_saved' || tier === 'pro' || tier === 'authenticated_free') {
    if (session) {
      inputs = { ...session.inputs }
      ui = { ...defaultUi, ...session.ui }
      phase = session.phase
      activePreset = session.activePreset
    }
    if (profile) {
      inputs = { ...inputs, ...profileToCalculatorPatch(profile) }
    }
    inputs = mergeManualAccountsIntoInputs(inputs, accounts)
    inputs = applyFidelityBalanceOverrides(inputs)
  }

  const onboardingComplete = resolveOnboardingComplete(tier, profile, accounts)

  return {
    tier,
    inputs,
    ui,
    phase,
    activePreset,
    onboardingComplete,
    profile,
    accounts,
  }
}

/**
 * Boot sequence: read meta → migrate legacy (if any) → resolve tier → hydrate plan state.
 * Auth `/api/auth/me` must be fetched by the caller before this runs (step 2).
 */
export function bootPlanHydration(
  auth: AuthTierInput,
  options?: Pick<HydratePlanOptions, 'defaultInputs' | 'defaultUi'>,
): PlanHydration {
  loadMeta()
  migrateLegacyPlanStorageIfNeeded()
  const tier = resolveUserTier(auth)
  return hydratePlanStateForTier(tier, options)
}

/** @deprecated Prefer bootPlanHydration for explicit boot ordering. */
export function hydratePlanState(options: HydratePlanOptions): PlanHydration {
  return bootPlanHydration(options.auth, options)
}

export function buildPlanSessionFromState(
  inputs: CalculatorInputs,
  ui: CalculatorUi,
  phase: 'growth' | 'income',
  activePreset: string | null,
) {
  return buildSnapshot(inputs, ui, phase, activePreset)
}
