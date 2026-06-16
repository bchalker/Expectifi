import { CloseButton } from '@heroui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBottomSheetDrag } from '../../hooks/useBottomSheetDrag'
import { useIsMobileBottomSheet } from '../../hooks/useMobileBottomSheet'
import { OnboardingProgressSteps } from '../OnboardingProgressSteps'
import { BottomSheetHandle } from '../ui/BottomSheetHandle'
import {
  hasRetirementPreferences,
  markDestinationPrefsOverlayOpened,
  type CorePreferenceKey,
  type RetirementPreferences,
} from '../../types/preferences'
import type { MapFilters } from '../../lib/whereToRetire/cityMapScoring'
import { WIZARD_STEP_LABELS } from '../../utils/preferenceFactors'
import {
  PreferencesWizard,
  PREFERENCES_WIZARD_STEP_COUNT,
  type PreferencesWizardMode,
} from './PreferencesWizard'
import './PreferencesWizard.scss'
import '../whereToRetire/WtrFilterPriorityCrossRef.scss'

const FADE_MS = 280
const SLIDE_MS = 320

export type PreferencesWizardPlacement = 'center' | 'map-rail'

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
  placement?: PreferencesWizardPlacement
  initialWizardStep?: number
  scrollToFactorId?: CorePreferenceKey | null
  mapFilters?: MapFilters
}

export function PreferencesWizardModal({
  open,
  onClose,
  initialValues,
  onComplete,
  mode = 'stepped',
  allowDismiss,
  placement = 'center',
  initialWizardStep = 1,
  scrollToFactorId = null,
  mapFilters,
}: Props) {
  const isMapRail = placement === 'map-rail'
  const isMobileSheet = useIsMobileBottomSheet() && isMapRail
  const panelRef = useRef<HTMLElement>(null)
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(open && prefersReducedMotion())
  const [wizardStep, setWizardStep] = useState(1)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const canDismiss = allowDismiss ?? hasRetirementPreferences()
  const closeMs = isMapRail ? SLIDE_MS : FADE_MS

  const {
    isDragging,
    panelStyle,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useBottomSheetDrag({
    enabled: isMobileSheet,
    open: visible,
    panelRef,
    onDismiss: onClose,
  })

  useEffect(() => {
    if (open) setWizardStep(initialWizardStep)
  }, [open, initialWizardStep])

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
    const timeout = window.setTimeout(() => setMounted(false), closeMs)
    return () => window.clearTimeout(timeout)
  }, [open, mounted, closeMs])

  useEffect(() => {
    if (!mounted || typeof document === 'undefined') {
      setPortalRoot(null)
      return
    }

    if (isMapRail && !isMobileSheet) {
      setPortalRoot(
        (document.querySelector('.wtr-explorer__map-row') as HTMLElement | null) ??
          document.body,
      )
      return
    }

    setPortalRoot(document.body)
  }, [mounted, isMapRail, isMobileSheet])

  useEffect(() => {
    if (!visible || !canDismiss) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visible, canDismiss, onClose])

  const handlePanelTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return
      const endProperty = isMapRail ? 'transform' : 'opacity'
      if (e.propertyName !== endProperty) return
      if (open || visible) return
      setMounted(false)
    },
    [isMapRail, open, visible],
  )

  if (!mounted || !portalRoot) return null

  const panelContent = (
    <div className="pref-wizard-modal__panel">
      <header
        className={[
          'pref-wizard-modal__header',
          mode === 'stepped' && 'pref-wizard-modal__header--stepped',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {mode === 'stepped' ? (
          <OnboardingProgressSteps
            activeIndex={wizardStep - 1}
            totalSteps={PREFERENCES_WIZARD_STEP_COUNT}
            className="pref-wizard-modal__progress"
            ariaLabel={`Step ${wizardStep} of ${PREFERENCES_WIZARD_STEP_COUNT}`}
          />
        ) : null}
        <div
          className={[
            'pref-wizard-modal__title-stack',
            canDismiss && 'pref-wizard-modal__title-stack--with-close',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <h2 className="pref-wizard-modal__title" id="pref-wizard-modal-title">
            {mode === 'stepped'
              ? `Step ${wizardStep} of ${PREFERENCES_WIZARD_STEP_COUNT} — ${WIZARD_STEP_LABELS[wizardStep]}`
              : 'Set your retirement priorities'}
          </h2>
          <p className="pref-wizard-modal__helper">
            {mode === 'stepped' && wizardStep === 4
              ? 'For these, only activate those you want weighted in the results.'
              : 'The more honest you are, the more useful your results.'}
          </p>
        </div>
        {canDismiss ? (
          <CloseButton
            className={[
              'pref-wizard-modal__close',
              isMapRail && 'panel-close-btn',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label="Close preferences"
            onPress={onClose}
          />
        ) : null}
      </header>
      <PreferencesWizard
        mode={mode}
        initialValues={initialValues}
        initialWizardStep={initialWizardStep}
        scrollToFactorId={scrollToFactorId}
        mapFilters={mapFilters}
        onComplete={onComplete}
        progressPlacement="external"
        onWizardStepChange={setWizardStep}
      />
    </div>
  )

  const modal = isMapRail ? (
    <>
      {!isMobileSheet && visible ? (
        <button
          type="button"
          className="wtr-explorer__drawer-backdrop wtr-explorer__drawer-backdrop--open"
          aria-label="Close preferences"
          onClick={onClose}
        />
      ) : null}
      {isMobileSheet && visible ? (
        <div
          className="mobile-bottom-sheet-backdrop mobile-bottom-sheet-backdrop--open"
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        ref={panelRef}
        className={[
          'pref-wizard-modal',
          'pref-wizard-modal--map-rail',
          isMobileSheet && 'pref-wizard-modal--mobile-sheet',
          visible && 'pref-wizard-modal--visible',
          isDragging && 'mobile-bottom-sheet-panel--dragging',
        ]
          .filter(Boolean)
          .join(' ')}
        style={isMobileSheet ? panelStyle : undefined}
        role="dialog"
        aria-modal={isMobileSheet}
        aria-labelledby="pref-wizard-modal-title"
        onTransitionEnd={handlePanelTransitionEnd}
      >
        {isMobileSheet ? (
          <BottomSheetHandle
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        ) : null}
        {panelContent}
      </aside>
    </>
  ) : (
    <div
      className={['pref-wizard-modal', visible && 'pref-wizard-modal--visible']
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pref-wizard-modal-title"
      onTransitionEnd={handlePanelTransitionEnd}
    >
      {panelContent}
    </div>
  )

  return createPortal(modal, portalRoot)
}
