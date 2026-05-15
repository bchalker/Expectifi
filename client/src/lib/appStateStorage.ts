import type { AppSnapshotV1 } from './appSnapshot'

/** Dev / pre-DB persistence for calculator inputs, UI flags, phase, and presets. */
export const APP_STATE_STORAGE_KEY = 'retirement-calculator/app-state-v1'

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
