import { useEffect, useState } from 'react'

/** Desktop column layout: detail panel in-flow beside map (not overlay). */
export const WTR_DETAIL_COLUMN_MIN_WIDTH_PX = 1919
export const WTR_DETAIL_COLUMN_MQ = `(min-width: ${WTR_DETAIL_COLUMN_MIN_WIDTH_PX}px)`

export function useWtrDetailColumnLayout(): boolean {
  const [detailColumnLayout, setDetailColumnLayout] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(WTR_DETAIL_COLUMN_MQ).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(WTR_DETAIL_COLUMN_MQ)
    const sync = () => setDetailColumnLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return detailColumnLayout
}
