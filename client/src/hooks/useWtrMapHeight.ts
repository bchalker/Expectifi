import { useLayoutEffect, useState, type RefObject } from 'react'

/** Pixel height for the Leaflet map row — fills viewport below measured chrome. */
export function useWtrMapHeight(
  chromeRef: RefObject<HTMLElement | null>,
  bottomPaddingPx = 16,
) {
  const [heightPx, setHeightPx] = useState(480)

  useLayoutEffect(() => {
    const measure = () => {
      const header = document.querySelector('.app-header-shell')
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0
      const chromeBottom = chromeRef.current?.getBoundingClientRect().bottom ?? headerBottom
      const next = Math.max(420, Math.round(window.innerHeight - chromeBottom - bottomPaddingPx))
      setHeightPx(next)
    }

    measure()
    window.addEventListener('resize', measure)

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    const header = document.querySelector('.app-header-shell')
    if (ro && header) ro.observe(header)

    const chromeEl = chromeRef.current
    if (ro && chromeEl) ro.observe(chromeEl)

    return () => {
      window.removeEventListener('resize', measure)
      ro?.disconnect()
    }
  }, [chromeRef, bottomPaddingPx])

  return heightPx
}
