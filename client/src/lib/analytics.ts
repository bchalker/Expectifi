/** Google Analytics 4 — measurement ID (gtag.js loaded in client/index.html). */
export const GA_MEASUREMENT_ID = 'G-DX0VYXWFEW'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/** SPA route changes — initial page view is sent by gtag config in index.html. */
export function trackPageView(pagePath: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: pagePath,
  })
}
