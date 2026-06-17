import { useEffect, useState } from 'react'

const COUNT_DURATION_MS = 520
const RELIGION_DELAY_MS = COUNT_DURATION_MS + 120

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

function motionMs(defaultMs: number) {
  if (typeof window === 'undefined') return defaultMs
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : defaultMs
}

/** Single orchestrated count-up (0 → 1), then religion bar reveal — avoids jitter from parallel hooks. */
export function usePeopleCultureMetricsAnimation(scopeKey: string) {
  const [countProgress, setCountProgress] = useState(0)
  const [religionRevealed, setReligionRevealed] = useState(false)

  useEffect(() => {
    if (!scopeKey) {
      setCountProgress(0)
      setReligionRevealed(false)
      return
    }

    setCountProgress(0)
    setReligionRevealed(false)

    const countMs = motionMs(COUNT_DURATION_MS)
    const religionDelayMs = motionMs(RELIGION_DELAY_MS)

    if (countMs <= 0) {
      setCountProgress(1)
      setReligionRevealed(true)
      return
    }

    let cancelled = false
    let countRaf = 0
    let religionTimer = 0

    countRaf = requestAnimationFrame(() => {
      if (cancelled) return
      const t0 = performance.now()
      const step = (now: number) => {
        if (cancelled) return
        const u = Math.min(1, (now - t0) / countMs)
        setCountProgress(easeOutCubic(u))
        if (u < 1) countRaf = requestAnimationFrame(step)
        else setCountProgress(1)
      }
      countRaf = requestAnimationFrame(step)
    })

    religionTimer = window.setTimeout(() => {
      if (!cancelled) setReligionRevealed(true)
    }, religionDelayMs)

    return () => {
      cancelled = true
      cancelAnimationFrame(countRaf)
      window.clearTimeout(religionTimer)
    }
  }, [scopeKey])

  return { countProgress, religionRevealed }
}

export function scaledMetricValue(target: number, progress: number): number {
  if (!Number.isFinite(target) || progress <= 0) return 0
  if (progress >= 1) return target
  return target * progress
}
