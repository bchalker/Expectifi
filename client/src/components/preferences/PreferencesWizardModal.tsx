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

const FADE_OUT_ANIMATION = 'pref-wizard-modal-fade-out'

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
  const [closing, setClosing] = useState(false)
  const canDismiss = allowDismiss ?? hasRetirementPreferences()

  useEffect(() => {
    if (open) {
      markDestinationPrefsOverlayOpened()
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mounted) return
    if (prefersReducedMotion()) {
      setMounted(false)
      setClosing(false)
      return
    }
    setClosing(true)
  }, [open, mounted])

  const handleOverlayAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.animationName !== FADE_OUT_ANIMATION) return
      if (!closing) return
      setClosing(false)
      setMounted(false)
    },
    [closing],
  )

  if (!mounted) return null

  return createPortal(
    <div
      className={['pref-wizard-modal', closing ? 'pref-wizard-modal--closing' : '']
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Retirement preferences"
      onAnimationEnd={handleOverlayAnimationEnd}
    >
      <div className="pref-wizard-modal__panel">
        <div className="pref-wizard-modal__header">
          <div className="pref-wizard-modal__header-copy">
            <h2 className="pref-wizard-modal__title">Set your retirement priorities</h2>
            <p className="pref-wizard-modal__helper">
              Your answers personalize how every city is scored — the more honest you are, the more
              useful your results. You can always update these in Settings → Preferences as your
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
