import { type RefObject, useLayoutEffect, useState } from 'react'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function computeProgress(section: HTMLElement): number {
  const rect = section.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const sectionHeight = section.offsetHeight

  // Hold full skew until the section is further into view, finish near the end of the section.
  const startTop = viewportHeight * 0.82
  const endTop = Math.min(
    viewportHeight * 0.04,
    viewportHeight - sectionHeight * 0.94,
  )

  if (startTop <= endTop) return 1

  const linear = clamp((startTop - rect.top) / (startTop - endTop), 0, 1)
  // Ease-out keeps the phone skewed longer through the scroll.
  return Math.pow(linear, 1.55)
}

/** 0 = skewed phone, 1 = flat — driven by FAQ section scroll position in the viewport. */
export function useLandingFaqPhoneScroll(
  sectionRef: RefObject<HTMLElement | null>,
): number {
  const [progress, setProgress] = useState(0)

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    if (prefersReducedMotion()) {
      setProgress(1)
      return
    }

    let raf = 0

    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setProgress(computeProgress(section))
      })
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })

    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(section)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      ro?.disconnect()
    }
  }, [sectionRef])

  return progress
}
