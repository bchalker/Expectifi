import { useEffect } from 'react'

const WTR_PAGE_SCROLL_SELECTOR = '.where-to-retire__body--map'

/** Prevent duplicate scrollbars when a WTR overlay/panel is open over the map page. */
export function useWtrPageScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const html = document.documentElement
    const body = document.body
    const pageScroll = document.querySelector<HTMLElement>(WTR_PAGE_SCROLL_SELECTOR)

    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    const prevPage = pageScroll?.style.overflow ?? ''

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    if (pageScroll) pageScroll.style.overflow = 'hidden'

    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
      if (pageScroll) pageScroll.style.overflow = prevPage
    }
  }, [locked])
}
