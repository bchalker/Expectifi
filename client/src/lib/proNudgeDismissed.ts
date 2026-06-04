export const PRO_NUDGE_DISMISSED_KEY = 'expectifi/pro-nudge-dismissed'

export function isProNudgeDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(PRO_NUDGE_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissProNudge(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PRO_NUDGE_DISMISSED_KEY, '1')
  } catch {
    /* private mode / quota */
  }
}
