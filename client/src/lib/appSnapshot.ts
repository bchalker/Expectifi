import { approxIsoDobFromAge, isValidIsoDateString } from './ageFromDob'
import { normalizeCalculatorFilingStatus } from './filingStatus'
import { normalizeIncomePresets, type CalculatorInputs, type CalculatorUi } from './computeResults'
import type { AccountIncomeStrategy } from './accountIncomeStrategy'
import { normalizeRetireRegions } from './calc/retireRegions'
import { findIncomeSecurity } from './incomeSecurities'
import { normalizeSocialSecurityFields } from './socialSecurity'

export type AppSnapshotV1 = {
  version: 1
  inputs: CalculatorInputs
  ui: CalculatorUi
  phase: 'growth' | 'income'
  /** Matches `IncomeYieldPreset.id` from `inputs.incomePresets`. */
  activePreset: string | null
}

export function buildSnapshot(
  inputs: CalculatorInputs,
  ui: CalculatorUi,
  phase: 'growth' | 'income',
  activePreset: string | null,
): AppSnapshotV1 {
  const { incomePresetEditorFocusSeq: _ignored, ...uiForSave } = ui
  return {
    version: 1,
    inputs: { ...inputs },
    ui: { ...uiForSave },
    phase,
    activePreset,
  }
}

export function parseSnapshot(raw: unknown): AppSnapshotV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.version !== 1 || !o.inputs || typeof o.inputs !== 'object') return null
  return o as AppSnapshotV1
}

/** Merge a saved or cloud snapshot with defaults (handles legacy fields and partial saves). */
export function hydrateAppSnapshot(raw: unknown, defaultInputs: CalculatorInputs): AppSnapshotV1 | null {
  const parsed = parseSnapshot(raw)
  if (!parsed) return null

  const merged: Record<string, unknown> = {
    ...(defaultInputs as unknown as Record<string, unknown>),
    ...((parsed.inputs ?? {}) as Record<string, unknown>),
  }
  const legacyAge = typeof merged.currentAge === 'number' ? merged.currentAge : undefined
  delete merged.currentAge
  delete merged.spxPct

  const base = merged as unknown as CalculatorInputs
  let dateOfBirth = base.dateOfBirth
  if (!dateOfBirth || !isValidIsoDateString(dateOfBirth)) {
    dateOfBirth =
      typeof legacyAge === 'number' && Number.isFinite(legacyAge)
        ? approxIsoDobFromAge(legacyAge)
        : defaultInputs.dateOfBirth
  }

  const legacyItalyCost =
    typeof merged.italyCost === 'number' && Number.isFinite(merged.italyCost) ? merged.italyCost : undefined
  delete merged.italyCost

  const incomePresets = normalizeIncomePresets(base.incomePresets)
  const ids = new Set(incomePresets.map((p) => p.id))
  let activePreset = typeof parsed.activePreset === 'string' ? parsed.activePreset : null
  if (activePreset != null && !ids.has(activePreset)) {
    activePreset = incomePresets[0]?.id ?? null
  }

  const phase = parsed.phase === 'growth' || parsed.phase === 'income' ? parsed.phase : 'growth'
  const uiRaw: Record<string, unknown> =
    parsed.ui && typeof parsed.ui === 'object' ? (parsed.ui as Record<string, unknown>) : {}
  const { incomePresetEditorFocusSeq: _ignored, ...uiRest } = uiRaw

  return {
    version: 1,
    inputs: {
      ...base,
      dateOfBirth,
      incomePresets,
      positionReturnModels: Array.isArray(base.positionReturnModels) ? base.positionReturnModels : [],
      accountReturnScenarios:
        base.accountReturnScenarios && typeof base.accountReturnScenarios === 'object'
          ? base.accountReturnScenarios
          : {},
      retireRegions: normalizeRetireRegions(base.retireRegions, legacyItalyCost),
      filingStatus: normalizeCalculatorFilingStatus(
        base.filingStatus ?? defaultInputs.filingStatus,
      ),
      ...normalizeSocialSecurityFields(base, defaultInputs),
    },
    ui: {
      incomeMode: uiRest.incomeMode !== false,
      ssIncluded: uiRest.ssIncluded === true,
      incomeSecurityTicker: (() => {
        const raw =
          typeof uiRest.incomeSecurityTicker === 'string' && uiRest.incomeSecurityTicker.trim()
            ? uiRest.incomeSecurityTicker.trim()
            : null
        if (!raw) return null
        return findIncomeSecurity(raw) ? raw : null
      })(),
      accountIncomeFunds: (() => {
        const raw = uiRest.accountIncomeFunds
        if (!raw || typeof raw !== 'object') return {}
        const out: Record<string, string> = {}
        for (const [key, val] of Object.entries(raw)) {
          if (typeof key !== 'string' || typeof val !== 'string') continue
          const ticker = val.trim()
          if (!ticker || !findIncomeSecurity(ticker)) continue
          out[key] = ticker
        }
        return out
      })(),
      accountIncomeStrategies: (() => {
        const raw = uiRest.accountIncomeStrategies
        if (!raw || typeof raw !== 'object') return {}
        const out: Record<string, AccountIncomeStrategy> = {}
        for (const [key, val] of Object.entries(raw)) {
          if (typeof key !== 'string') continue
          if (val === 'none' || val === 'dividend' || val === 'withdraw' || val === 'both') out[key] = val
        }
        return out
      })(),
      accountWithdrawRates: (() => {
        const raw = uiRest.accountWithdrawRates
        if (!raw || typeof raw !== 'object') return {}
        const out: Record<string, number> = {}
        for (const [key, val] of Object.entries(raw)) {
          if (typeof key !== 'string' || typeof val !== 'number' || !Number.isFinite(val)) continue
          out[key] = val
        }
        return out
      })(),
    },
    phase,
    activePreset,
  }
}
