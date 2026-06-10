import { useEffect } from 'react'

const APP_SCROLL_SELECTOR = '.app-scroll-stack'
const APP_SCROLL_VIEWPORT_SELECTOR =
  '.app-scroll-stack [data-overlayscrollbars-viewport]'
const WTR_PAGE_SCROLL_SELECTOR = '.where-to-retire__body--map'

/** Prevent duplicate scrollbars when a WTR overlay/panel is open over the map page. */
export function useWtrPageScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const scrollHost = document.querySelector<HTMLElement>(APP_SCROLL_SELECTOR)
    const scrollViewport = document.querySelector<HTMLElement>(APP_SCROLL_VIEWPORT_SELECTOR)
    const pageScroll = document.querySelector<HTMLElement>(WTR_PAGE_SCROLL_SELECTOR)

    const prevHost = scrollHost?.style.overflow ?? ''
    const prevViewport = scrollViewport?.style.overflow ?? ''
    const prevPage = pageScroll?.style.overflow ?? ''

    if (scrollHost) scrollHost.style.overflow = 'hidden'
    if (scrollViewport) scrollViewport.style.overflow = 'hidden'
    if (pageScroll) pageScroll.style.overflow = 'hidden'

    return () => {
      if (scrollHost) scrollHost.style.overflow = prevHost
      if (scrollViewport) scrollViewport.style.overflow = prevViewport
      if (pageScroll) pageScroll.style.overflow = prevPage
    }
  }, [locked])
}
