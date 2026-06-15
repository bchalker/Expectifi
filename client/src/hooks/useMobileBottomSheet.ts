import { useEffect, useState } from 'react'

/** Mobile and tablet: bottom-sheet panels; desktop (900px+) uses side slides. */
export const MOBILE_BOTTOM_SHEET_MQ = '(max-width: 899px)'

export function useIsMobileBottomSheet(): boolean {
  const [isMobileSheet, setIsMobileSheet] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(MOBILE_BOTTOM_SHEET_MQ).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(MOBILE_BOTTOM_SHEET_MQ)
    const sync = () => setIsMobileSheet(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return isMobileSheet
}
