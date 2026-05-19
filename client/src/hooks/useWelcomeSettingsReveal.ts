import { useEffect, useRef, useState } from 'react'

/** Show configure/settings chrome only after welcome onboarding; animate once when it first appears. */
export function useWelcomeSettingsReveal(welcomeDone: boolean) {
  const prevRef = useRef(welcomeDone)
  const [slideIn, setSlideIn] = useState(false)

  useEffect(() => {
    if (welcomeDone && !prevRef.current) setSlideIn(true)
    if (!welcomeDone) setSlideIn(false)
    prevRef.current = welcomeDone
  }, [welcomeDone])

  return { showSettings: welcomeDone, slideIn }
}
