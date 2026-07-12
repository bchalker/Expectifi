import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

export const MOBILE_BOTTOM_SHEET_SLIDE_MS = 300

type Options = {
  durationMs?: number
  trackAnimation?: boolean
}

/** True only while a bottom/side sheet transform (or slide animation) is running. */
export function useBottomSheetSlideShadow(
  panelRef: RefObject<HTMLElement | null>,
  open: boolean,
  enabled: boolean,
  { durationMs = MOBILE_BOTTOM_SHEET_SLIDE_MS, trackAnimation = false }: Options = {},
): boolean {
  const [isSliding, setIsSliding] = useState(false)
  const skipInitial = useRef(true)
  const prevOpen = useRef(open)

  useLayoutEffect(() => {
    if (!enabled) {
      setIsSliding(false)
      return
    }

    if (skipInitial.current) {
      skipInitial.current = false
      prevOpen.current = open
      setIsSliding(false)
      return
    }

    if (prevOpen.current === open) return
    prevOpen.current = open

    const panel = panelRef.current
    if (!panel) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setIsSliding(false)
      return
    }

    setIsSliding(true)

    const endSliding = () => setIsSliding(false)

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== panel || event.propertyName !== 'transform') return
      endSliding()
    }

    const handleAnimationEnd = (event: AnimationEvent) => {
      if (!trackAnimation || event.target !== panel) return
      endSliding()
    }

    panel.addEventListener('transitionend', handleTransitionEnd)
    if (trackAnimation) {
      panel.addEventListener('animationend', handleAnimationEnd)
    }
    const fallback = window.setTimeout(endSliding, durationMs + 50)

    return () => {
      panel.removeEventListener('transitionend', handleTransitionEnd)
      if (trackAnimation) {
        panel.removeEventListener('animationend', handleAnimationEnd)
      }
      window.clearTimeout(fallback)
    }
  }, [open, enabled, durationMs, trackAnimation, panelRef])

  return isSliding
}
