import { useLayoutEffect } from 'react'

function scrollbarGutterPx(): number {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth)
}

/** Fixed chrome that spans the viewport — pad when the scrollbar gutter closes. */
const FIXED_CHROME_SELECTORS = [
  '.app-header-stack',
  '.app-privacy-trust',
  '.account-plan-bottom-banner',
] as const

/**
 * Lock window scroll without shifting sticky/fixed layout.
 * `overflow: hidden` on body breaks `position: sticky` (hero wave jumps).
 */
export function useBodyScrollLock(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked) return

    const scrollY = window.scrollY
    const gutter = scrollbarGutterPx()
    const body = document.body

    const prevBody = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
      touchAction: body.style.touchAction,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.touchAction = 'none'
    if (gutter > 0) {
      body.style.paddingRight = `${gutter}px`
    }

    const chromeEls = FIXED_CHROME_SELECTORS.flatMap((selector) => {
      const el = document.querySelector<HTMLElement>(selector)
      return el ? [el] : []
    })

    const prevChrome = chromeEls.map((el) => ({
      el,
      paddingRight: el.style.paddingRight,
    }))

    if (gutter > 0) {
      for (const el of chromeEls) {
        el.style.paddingRight = `${gutter}px`
      }
    }

    return () => {
      body.style.position = prevBody.position
      body.style.top = prevBody.top
      body.style.left = prevBody.left
      body.style.right = prevBody.right
      body.style.width = prevBody.width
      body.style.paddingRight = prevBody.paddingRight
      body.style.touchAction = prevBody.touchAction

      for (const { el, paddingRight } of prevChrome) {
        el.style.paddingRight = paddingRight
      }

      window.scrollTo(0, scrollY)
    }
  }, [locked])
}
