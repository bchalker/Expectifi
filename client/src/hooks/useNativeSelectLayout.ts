import { useEffect, useState } from 'react'

/** Match app mobile breakpoint — native OS pickers below this width. */
export const NATIVE_SELECT_LAYOUT_MQ = '(max-width: 680px)'

export function useNativeSelectLayout(): boolean {
  const [native, setNative] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(NATIVE_SELECT_LAYOUT_MQ).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(NATIVE_SELECT_LAYOUT_MQ)
    const sync = () => setNative(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return native
}
