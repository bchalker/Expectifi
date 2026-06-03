const WTR_EXPLORATION_INCOME_KEY = 'expectifi/wtr-exploration-income-v1'

/** Pass projected monthly income into Where to Retire when opening from income dashboard. */
export function stashWtrExplorationIncome(monthlyIncome: number): void {
  try {
    sessionStorage.setItem(WTR_EXPLORATION_INCOME_KEY, String(monthlyIncome))
  } catch {
    /* sessionStorage unavailable */
  }
}

export function readStashedWtrExplorationIncome(): number | null {
  try {
    const raw = sessionStorage.getItem(WTR_EXPLORATION_INCOME_KEY)
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : null
  } catch {
    return null
  }
}
