export const APP_PATHS = {
  home: '/',
  onboarding: '/onboarding',
  login: '/login',
  privacy: '/privacy',
  terms: '/terms',
  whereToRetire: '/where-to-retire',
} as const

/** Calculator dashboard after onboarding (not the onboarding flow URL). */
export const APP_DASHBOARD_PATH = APP_PATHS.home

export type AppPath = (typeof APP_PATHS)[keyof typeof APP_PATHS]

export function normalizeAppPath(pathname: string): string {
  if (!pathname || pathname === '/') return APP_PATHS.home
  const base = pathname.split('?')[0]?.split('#')[0] ?? '/'
  if (base.length > 1 && base.endsWith('/')) return base.slice(0, -1)
  return base
}

function syncAppPath(path: string, mode: 'push' | 'replace'): void {
  const next = normalizeAppPath(path)
  if (normalizeAppPath(window.location.pathname) === next) return
  if (mode === 'replace') {
    window.history.replaceState({}, '', next)
  } else {
    window.history.pushState({}, '', next)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function navigateApp(path: string): void {
  syncAppPath(path, 'push')
}

/** Replace URL without adding history (e.g. leave /onboarding after finishing setup). */
export function replaceAppPath(path: string): void {
  syncAppPath(path, 'replace')
}
