import { IconUserCircle } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { OnboardingProgressSteps } from '../OnboardingProgressSteps'
import { AppButton } from '../ui/AppButton'
import { AppOverlayScrollbars } from '../ui/AppOverlayScrollbars'
import {
  createDailyLifeFactor,
  DEFAULT_PREFERENCES,
  normalizeRetirementPreferences,
  RETIREMENT_WIZARD_CONFIG,
  saveRetirementPreferences,
  type CorePreferenceKey,
  type DailyLifeFactorId,
  type PreferenceStep,
  type RetirementPreferences,
  type WizardConfig,
} from '../../types/preferences'
import { buildNarrative } from '../../utils/preferencesNarrative'
import {
  STEP_1_FINANCIAL,
  STEP_2_SAFETY,
  STEP_3_LIFESTYLE,
  STEP_4_DAILY,
  WIZARD_STEP_LABELS,
  wizardStepForFactor,
  type PreferenceFactorId,
} from '../../utils/preferenceFactors'
import { PreferenceFactorRow } from './PreferenceFactorRow'
import { PreferenceReviewRow } from './PreferenceReviewRow'
import './PreferencesWizard.scss'

export type PreferencesWizardMode = 'stepped' | 'settings'
export type PreferencesWizardProgressPlacement = 'inline' | 'external'

type Props = {
  config?: WizardConfig
  initialValues?: RetirementPreferences
  mode?: PreferencesWizardMode
  progressPlacement?: PreferencesWizardProgressPlacement
  onWizardStepChange?: (step: number) => void
  onChange?: (prefs: RetirementPreferences) => void
  onComplete?: (prefs: RetirementPreferences) => void
  onSkip?: () => void
  onRetake?: () => void
}

export const PREFERENCES_WIZARD_STEP_COUNT = 5

function reviewActiveFactors(prefs: RetirementPreferences) {
  const core = (
    [
      ...STEP_1_FINANCIAL,
      ...STEP_2_SAFETY,
      ...STEP_3_LIFESTYLE,
    ] as CorePreferenceKey[]
  )
    .filter((key) => prefs[key] > 0)
    .map((key) => ({ id: key as PreferenceFactorId, step: prefs[key], daily: false }))

  const daily = prefs.dailyLife
    .filter((entry) => entry.step > 0)
    .map((entry) => ({
      id: entry.factor as PreferenceFactorId,
      step: entry.step,
      daily: true,
    }))

  return { core, daily }
}

export function PreferencesWizard({
  config = RETIREMENT_WIZARD_CONFIG,
  initialValues,
  mode = 'stepped',
  progressPlacement = 'inline',
  onWizardStepChange,
  onChange,
  onComplete,
  onSkip,
  onRetake,
}: Props) {
  const [prefs, setPrefs] = useState<RetirementPreferences>(() =>
    normalizeRetirementPreferences(initialValues ?? { ...DEFAULT_PREFERENCES, dailyLife: [] }),
  )
  const [wizardStep, setWizardStep] = useState(1)

  useEffect(() => {
    if (initialValues) setPrefs(normalizeRetirementPreferences(initialValues))
  }, [initialValues])

  useEffect(() => {
    if (mode === 'stepped') onWizardStepChange?.(wizardStep)
  }, [mode, onWizardStepChange, wizardStep])

  const showInlineProgress = mode === 'stepped' && progressPlacement === 'inline'

  const updatePrefs = useCallback(
    (updater: (prev: RetirementPreferences) => RetirementPreferences) => {
      setPrefs((prev) => {
        const next = updater(prev)
        onChange?.(next)
        return next
      })
    },
    [onChange],
  )

  const setCoreStep = useCallback(
    (key: CorePreferenceKey, step: PreferenceStep) => {
      updatePrefs((prev) => ({ ...prev, [key]: step }))
    },
    [updatePrefs],
  )

  const setClimateTempRange = useCallback(
    (climateTempMinF: number, climateTempMaxF: number) => {
      updatePrefs((prev) => ({ ...prev, climateTempMinF, climateTempMaxF }))
    },
    [updatePrefs],
  )

  const setDailyStep = useCallback(
    (factor: DailyLifeFactorId, step: PreferenceStep) => {
      updatePrefs((prev) => ({
        ...prev,
        dailyLife: prev.dailyLife.map((entry) =>
          entry.factor === factor ? { ...entry, step } : entry,
        ),
      }))
    },
    [updatePrefs],
  )

  const setDailyFactorEnabled = useCallback(
    (factor: DailyLifeFactorId, nextEnabled: boolean) => {
      updatePrefs((prev) => {
        const exists = prev.dailyLife.some((entry) => entry.factor === factor)
        if (nextEnabled) {
          if (exists) return prev
          return {
            ...prev,
            dailyLife: [...prev.dailyLife, createDailyLifeFactor(factor)],
          }
        }
        if (!exists) return prev
        return {
          ...prev,
          dailyLife: prev.dailyLife.filter((entry) => entry.factor !== factor),
        }
      })
    },
    [updatePrefs],
  )

  const getDailyStep = useCallback(
    (factor: DailyLifeFactorId): PreferenceStep => {
      return prefs.dailyLife.find((entry) => entry.factor === factor)?.step ?? 6
    },
    [prefs.dailyLife],
  )

  const selectedDaily = useMemo(
    () => new Set(prefs.dailyLife.map((entry) => entry.factor)),
    [prefs.dailyLife],
  )

  const narrative = useMemo(() => buildNarrative(prefs), [prefs])
  const reviewFactors = useMemo(() => reviewActiveFactors(prefs), [prefs])

  const handleSave = () => {
    saveRetirementPreferences(prefs, config)
    onComplete?.(prefs)
  }

  const handleSkipDaily = () => {
    onSkip?.()
    setWizardStep(5)
  }

  const renderCoreRow = (key: CorePreferenceKey) => (
    <PreferenceFactorRow
      key={key}
      factorId={key}
      step={prefs[key]}
      onStepChange={(step) => setCoreStep(key, step)}
      climateTempMinF={key === 'climate' ? prefs.climateTempMinF : undefined}
      climateTempMaxF={key === 'climate' ? prefs.climateTempMaxF : undefined}
      onClimateTempChange={key === 'climate' ? setClimateTempRange : undefined}
      readOnly={mode === 'stepped' && wizardStep === 5}
    />
  )

  const renderDailyRow = (factor: DailyLifeFactorId) => {
    const enabled = selectedDaily.has(factor)
    return (
      <PreferenceFactorRow
        key={factor}
        factorId={factor}
        step={getDailyStep(factor)}
        withEnableToggle
        enabled={enabled}
        onEnabledChange={(next) => setDailyFactorEnabled(factor, next)}
        onStepChange={(step) => setDailyStep(factor, step)}
        readOnly={mode === 'stepped' && wizardStep === 5}
      />
    )
  }

  const renderFactorList = (
    keys: CorePreferenceKey[] | DailyLifeFactorId[],
    groupLabel?: string,
    daily = false,
  ) => (
    <section className="pref-wizard__factor-group">
      {groupLabel ? <h4 className="pref-wizard__factor-group-label">{groupLabel}</h4> : null}
      <div className="pref-wizard__factor-list">
        {daily
          ? (keys as DailyLifeFactorId[]).map((factor) => renderDailyRow(factor))
          : (keys as CorePreferenceKey[]).map((key) => renderCoreRow(key))}
      </div>
    </section>
  )

  const canReviewNavigate = mode === 'stepped' && wizardStep === 5

  const renderReviewList = () => (
    <div className="pref-wizard__review-list">
      {reviewFactors.core.map(({ id, step }) => (
        <PreferenceReviewRow
          key={id}
          factorId={id}
          step={step}
          climateTempMinF={id === 'climate' ? prefs.climateTempMinF : undefined}
          climateTempMaxF={id === 'climate' ? prefs.climateTempMaxF : undefined}
          onNavigate={
            canReviewNavigate
              ? (factorId) => setWizardStep(wizardStepForFactor(factorId))
              : undefined
          }
        />
      ))}
      {reviewFactors.daily.length > 0 ? (
        <>
          <div className="pref-wizard__review-divider" aria-hidden />
          {reviewFactors.daily.map(({ id, step }) => (
            <PreferenceReviewRow
              key={id}
              factorId={id}
              step={step}
              onNavigate={
                canReviewNavigate
                  ? (factorId) => setWizardStep(wizardStepForFactor(factorId))
                  : undefined
              }
            />
          ))}
        </>
      ) : null}
    </div>
  )

  const renderNarrative = () => (
    <div className="pref-wizard__narrative">
      <div className="pref-wizard__narrative-header">
        <IconUserCircle size={18} stroke={1.5} aria-hidden />
        <span>Your retirement profile</span>
      </div>
      <p className="pref-wizard__narrative-copy">{narrative}</p>
    </div>
  )

  const renderStepBody = () => {
    if (mode === 'settings') {
      return (
        <div className="pref-wizard__sections">
          {renderFactorList(STEP_1_FINANCIAL, 'Financial')}
          {renderFactorList(STEP_2_SAFETY, 'Safety & health')}
          {renderFactorList(STEP_3_LIFESTYLE, 'Lifestyle & wellbeing')}
          {renderFactorList(STEP_4_DAILY, 'Daily life', true)}
          <div className="pref-wizard__review pref-wizard__review--settings">
            {renderReviewList()}
            {renderNarrative()}
          </div>
        </div>
      )
    }

    switch (wizardStep) {
      case 1:
        return renderFactorList(STEP_1_FINANCIAL)
      case 2:
        return renderFactorList(STEP_2_SAFETY)
      case 3:
        return renderFactorList(STEP_3_LIFESTYLE)
      case 4:
        return renderFactorList(STEP_4_DAILY, undefined, true)
      case 5:
      default:
        return (
          <div className="pref-wizard__review">
            {renderReviewList()}
            {renderNarrative()}
          </div>
        )
    }
  }

  const showSteppedNav = mode === 'stepped'
  const rootClassName = [
    'pref-wizard',
    mode === 'stepped' && 'pref-wizard--stepped',
    showSteppedNav && 'pref-wizard--with-nav',
    progressPlacement === 'external' && 'pref-wizard--external-progress',
    mode === 'settings' && 'pref-wizard--settings',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClassName}>
      {showInlineProgress ? (
        <header className="pref-wizard__progress">
          <OnboardingProgressSteps
            activeIndex={wizardStep - 1}
            totalSteps={PREFERENCES_WIZARD_STEP_COUNT}
            className="pref-wizard__progress-dots"
            ariaLabel={`Step ${wizardStep} of ${PREFERENCES_WIZARD_STEP_COUNT}`}
          />
          <p className="pref-wizard__progress-label">
            Step {wizardStep} of {PREFERENCES_WIZARD_STEP_COUNT} —{' '}
            {WIZARD_STEP_LABELS[wizardStep]}
          </p>
        </header>
      ) : null}

      {mode === 'stepped' ? (
        <AppOverlayScrollbars className="pref-wizard__scroll" defer={false}>
          <div className="pref-wizard__scroll-body">{renderStepBody()}</div>
        </AppOverlayScrollbars>
      ) : (
        <div className="pref-wizard__scroll-body pref-wizard__scroll-body--settings">
          {renderStepBody()}
        </div>
      )}

      {mode === 'settings' && onRetake ? (
        <p className="pref-wizard__retake">
          <button type="button" className="pref-wizard__retake-link" onClick={onRetake}>
            Retake from scratch
          </button>
        </p>
      ) : null}

      {showSteppedNav ? (
        <footer className="pref-wizard__nav">
          {wizardStep > 1 ? (
            <AppButton variant="secondary" onClick={() => setWizardStep((s) => s - 1)}>
              Back
            </AppButton>
          ) : (
            <span />
          )}
          <div className="pref-wizard__nav-actions">
            {wizardStep < 4 ? (
              <AppButton variant="primary" onClick={() => setWizardStep((s) => s + 1)}>
                Next
              </AppButton>
            ) : wizardStep === 4 ? (
              <>
                <button type="button" className="pref-wizard__skip-link" onClick={handleSkipDaily}>
                  Skip this step
                </button>
                <AppButton variant="primary" onClick={() => setWizardStep(5)}>
                  Next
                </AppButton>
              </>
            ) : (
              <AppButton variant="primary" onClick={handleSave}>
                Save preferences
              </AppButton>
            )}
          </div>
        </footer>
      ) : null}
    </div>
  )
}
