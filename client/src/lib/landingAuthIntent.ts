const AUTH_INTENT_KEY = 'expectifi_auth_intent'
const LEGACY_AUTH_INTENT_KEYS = ['headwayplanner_auth_intent', 'eggspectifi_auth_intent'] as const

export function consumeLandingAuthIntent(): 'register' | null {
  try {
    let intent = sessionStorage.getItem(AUTH_INTENT_KEY)
    if (!intent) {
      for (const legacyKey of LEGACY_AUTH_INTENT_KEYS) {
        intent = sessionStorage.getItem(legacyKey)
        if (intent) break
      }
    }
    sessionStorage.removeItem(AUTH_INTENT_KEY)
    for (const legacyKey of LEGACY_AUTH_INTENT_KEYS) {
      sessionStorage.removeItem(legacyKey)
    }
    if (intent === 'register') return 'register'
  } catch {
    /* ignore */
  }
  return null
}
