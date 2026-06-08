import { useEffect, useState } from 'react'

/** Mobile breakpoint for bottom-sheet panels (desktop drawer unchanged above this). */
export const MOBILE_BOTTOM_SHEET_MQ = '(max-width: 768px)'

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
