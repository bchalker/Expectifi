const AUTH_INTENT_KEY = 'eggspectifi_auth_intent'

export function consumeLandingAuthIntent(): 'register' | null {
  try {
    const intent = sessionStorage.getItem(AUTH_INTENT_KEY)
    sessionStorage.removeItem(AUTH_INTENT_KEY)
    if (intent === 'register') return 'register'
  } catch {
    /* ignore */
  }
  return null
}
