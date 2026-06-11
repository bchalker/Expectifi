const CALCULATOR_PHASE_SNAP_KEY = 'expectifi/calculator-phase'

export type CalculatorPhase = 'growth' | 'income'

export function saveCalculatorPhaseSnap(phase: CalculatorPhase): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(CALCULATOR_PHASE_SNAP_KEY, phase)
  } catch {
    /* private mode / quota */
  }
}

export function loadCalculatorPhaseSnap(): CalculatorPhase | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CALCULATOR_PHASE_SNAP_KEY)
    return raw === 'growth' || raw === 'income' ? raw : null
  } catch {
    return null
  }
}

export function clearCalculatorPhaseSnap(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(CALCULATOR_PHASE_SNAP_KEY)
  } catch {
    /* ignore */
  }
}

/** Same-tab refresh: sessionStorage wins over slower plan-session / server hydrate. */
export function resolveCalculatorPhase(persisted: CalculatorPhase): CalculatorPhase {
  return loadCalculatorPhaseSnap() ?? persisted
}
