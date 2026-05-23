export const APP_PATHS = {
  home: '/',
  onboarding: '/onboarding',
  login: '/login',
  privacy: '/privacy',
  terms: '/terms',
  whereToRetire: '/where-to-retire',
} as const

/** Signed-in calculator dashboard (portfolio, income, configure drawers). */
export const APP_DASHBOARD_PATH = APP_PATHS.onboarding

export type AppPath = (typeof APP_PATHS)[keyof typeof APP_PATHS]

export function normalizeAppPath(pathname: string): string {
  if (!pathname || pathname === '/') return APP_PATHS.home
  const base = pathname.split('?')[0]?.split('#')[0] ?? '/'
  if (base.length > 1 && base.endsWith('/')) return base.slice(0, -1)
  return base
}

export function navigateApp(path: string): void {
  const next = normalizeAppPath(path)
  if (normalizeAppPath(window.location.pathname) === next) return
  window.history.pushState({}, '', next)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
