import { buildSnapshot, hydrateAppSnapshot, type AppSnapshotV1 } from './appSnapshot'
import type { CalculatorInputs, CalculatorUi } from './computeResults'
import { stripFinancialFields } from './userProfileStorage'

/** Dev / pre-DB persistence for calculator inputs, UI flags, phase, and presets. */
export const APP_STATE_STORAGE_KEY = 'retirement-calculator/app-state-v1'

export type PersistedCalculatorSession = {
  inputs: CalculatorInputs
  ui: CalculatorUi
  phase: 'growth' | 'income'
  activePreset: string | null
}

export function persistCalculatorSession(session: PersistedCalculatorSession): void {
  saveStoredAppState(buildSnapshot(session.inputs, session.ui, session.phase, session.activePreset))
}

/** Guest sessions: persist planning fields only — balances are session-only. */
export function persistGuestCalculatorSession(session: PersistedCalculatorSession): void {
  persistCalculatorSession({
    ...session,
    inputs: stripFinancialFields(session.inputs),
  })
}

/** Restore saved session (guest or signed-in) before applying live Fidelity CSV overrides. */
export function loadPersistedCalculatorSession(
  defaultInputs: CalculatorInputs,
  defaultUi: CalculatorUi,
  options?: { stripFinancial?: boolean },
): PersistedCalculatorSession | null {
  const stored = loadStoredAppState()
  if (!stored) return null
  const hydrated = hydrateAppSnapshot(stored, defaultInputs)
  if (!hydrated) return null
  const { incomePresetEditorFocusSeq: _ignored, ...uiRest } = hydrated.ui
  const inputs = options?.stripFinancial
    ? stripFinancialFields(hydrated.inputs)
    : hydrated.inputs
  return {
    inputs,
    ui: { ...defaultUi, ...uiRest },
    phase: hydrated.phase,
    activePreset: hydrated.activePreset,
  }
}

export function loadStoredAppState(): AppSnapshotV1 | null {
  try {
    const raw = localStorage.getItem(APP_STATE_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AppSnapshotV1
  } catch {
    return null
  }
}

export function saveStoredAppState(snapshot: AppSnapshotV1): void {
  try {
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredAppState(): void {
  try {
    localStorage.removeItem(APP_STATE_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
