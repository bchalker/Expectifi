import { useEffect, useRef, useState } from 'react'

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

function motionMs(defaultMs: number) {
  if (typeof window === 'undefined') return defaultMs
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : defaultMs
}

/**
 * Eases the displayed scalar toward `target` when it changes (e.g. slider-driven recomputes).
 * Cancels in-flight animation if `target` changes again.
 */
export function useAnimatedScalar(target: number, defaultDurationMs = 420) {
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(display)
  displayRef.current = display

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setDisplay(0)
      return
    }
    const ms = motionMs(defaultDurationMs)
    const from = displayRef.current
    if (target === from) return
    if (ms <= 0) {
      setDisplay(target)
      return
    }

    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / ms)
      const next = from + (target - from) * easeOutCubic(u)
      setDisplay(next)
      if (u < 1) raf = requestAnimationFrame(step)
      else setDisplay(target)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, defaultDurationMs])

  return display
}
