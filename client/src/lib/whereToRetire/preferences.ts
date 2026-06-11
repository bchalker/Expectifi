import {
  hasRetirementPreferences,
  loadRetirementPreferences,
  resetRetirementPreferences,
  saveRetirementPreferences,
} from '../../types/preferences'

export type {
  PreferenceStep,
  DailyLifeFactor,
  DailyLifeFactorId,
  CorePreferenceKey,
  RetirementPreferences,
  WizardConfig,
} from '../../types/preferences'

export {
  DEFAULT_PREFERENCES,
  RETIREMENT_WIZARD_CONFIG,
  STEP_WEIGHTS,
  loadRetirementPreferences,
  saveRetirementPreferences,
  hasRetirementPreferences,
  resetRetirementPreferences,
  resolveRetirementPreferences,
  normalizeRetirementPreferences,
  createDailyLifeFactor,
} from '../../types/preferences'

/** @deprecated Use hasRetirementPreferences */
export function hasCompletedPreferences(): boolean {
  return hasRetirementPreferences()
}

/** @deprecated Use resetRetirementPreferences */
export function resetPreferences(): void {
  resetRetirementPreferences()
}

/** @deprecated Use loadRetirementPreferences */
export function loadPreferences() {
  return loadRetirementPreferences()
}

/** @deprecated Use saveRetirementPreferences */
export function savePreferences(prefs: import('../../types/preferences').RetirementPreferences): void {
  saveRetirementPreferences(prefs)
}
