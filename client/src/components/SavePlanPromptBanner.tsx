import { useEffect, useState } from 'react'
import { useUserTier } from '../hooks/useUserTier'
import { AppButton } from './ui/AppButton'
import './SavePlanPromptBanner.scss'

const SHOW_DELAY_MS = 1500
const EXIT_MS = 320

export function SavePlanPromptBanner() {
  const { showSavePlanPrompt, acceptBrowserSave, dismissSavePlanPrompt } = useUserTier()
  const [isMounted, setIsMounted] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (!showSavePlanPrompt) {
      setIsMounted(false)
      setIsRevealed(false)
      return
    }
    const showId = window.setTimeout(() => setIsMounted(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(showId)
  }, [showSavePlanPrompt])

  useEffect(() => {
    if (!isMounted || exiting) return
    let cancelled = false
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (!cancelled) setIsRevealed(true)
      })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf1)
      if (raf2) window.cancelAnimationFrame(raf2)
    }
  }, [isMounted, exiting])

  function dismissWithAnimation(action: () => void) {
    setIsRevealed(false)
    setExiting(true)
    window.setTimeout(() => {
      action()
      setIsMounted(false)
      setExiting(false)
    }, EXIT_MS)
  }

  if (!isMounted && !exiting) return null

  return (
    <div
      className={[
        'save-plan-prompt',
        isRevealed && !exiting ? 'save-plan-prompt--visible' : '',
        exiting ? 'save-plan-prompt--exiting' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="region"
      aria-live="polite"
      aria-label="Save your plan"
    >
      <div className="save-plan-prompt__inner">
        <p className="save-plan-prompt__message">Want to save your plan so you don&apos;t lose it?</p>
        <div className="save-plan-prompt__actions">
          <AppButton
            type="button"
            size="sm"
            variant="primary"
            className="save-plan-prompt__save"
            onPress={() => dismissWithAnimation(acceptBrowserSave)}
          >
            Save my plan
          </AppButton>
          <button
            type="button"
            className="save-plan-prompt__dismiss"
            onClick={() => dismissWithAnimation(dismissSavePlanPrompt)}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
