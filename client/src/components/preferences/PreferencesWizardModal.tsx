import { CloseButton } from '@heroui/react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  hasRetirementPreferences,
  markDestinationPrefsOverlayOpened,
  type RetirementPreferences,
} from '../../types/preferences'
import { PreferencesWizard, type PreferencesWizardMode } from './PreferencesWizard'
import './PreferencesWizard.scss'

const FADE_MS = 280

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

type Props = {
  open: boolean
  onClose: () => void
  initialValues: RetirementPreferences
  onComplete: (prefs: RetirementPreferences) => void
  mode?: PreferencesWizardMode
  allowDismiss?: boolean
}

export function PreferencesWizardModal({
  open,
  onClose,
  initialValues,
  onComplete,
  mode = 'stepped',
  allowDismiss,
}: Props) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open && prefersReducedMotion())
  const canDismiss = allowDismiss ?? hasRetirementPreferences()

  useEffect(() => {
    if (open) {
      markDestinationPrefsOverlayOpened()
      setMounted(true)
      if (prefersReducedMotion()) {
        setVisible(true)
        return
      }
      setVisible(false)
      let enterFrame = 0
      const mountFrame = window.requestAnimationFrame(() => {
        enterFrame = window.requestAnimationFrame(() => setVisible(true))
      })
      return () => {
        window.cancelAnimationFrame(mountFrame)
        if (enterFrame) window.cancelAnimationFrame(enterFrame)
      }
    }

    if (!mounted) return

    if (prefersReducedMotion()) {
      setVisible(false)
      setMounted(false)
      return
    }

    setVisible(false)
    const timeout = window.setTimeout(() => setMounted(false), FADE_MS)
    return () => window.clearTimeout(timeout)
  }, [open, mounted])

  const handleOverlayTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.propertyName !== 'opacity') return
      if (open || visible) return
      setMounted(false)
    },
    [open, visible],
  )

  if (!mounted) return null

  return createPortal(
    <div
      className={['pref-wizard-modal', visible && 'pref-wizard-modal--visible']
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Retirement preferences"
      onTransitionEnd={handleOverlayTransitionEnd}
    >
      <div className="pref-wizard-modal__panel">
        <div className="pref-wizard-modal__header">
          <div className="pref-wizard-modal__header-copy">
            <h2 className="pref-wizard-modal__title">Set your retirement priorities</h2>
            <p className="pref-wizard-modal__helper">
              Your answers personalize how every city is scored — the more honest you are, the more
              useful your results. You can always update these in Settings → Travel Priorities as your
              plans or priorities change.
            </p>
          </div>
          {canDismiss ? (
            <CloseButton aria-label="Close preferences" onPress={onClose} />
          ) : null}
        </div>
        <PreferencesWizard
          mode={mode}
          initialValues={initialValues}
          onComplete={onComplete}
        />
      </div>
    </div>,
    document.body,
  )
}
