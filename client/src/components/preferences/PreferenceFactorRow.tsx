import type { PreferenceStep } from '../../types/preferences'
import { DEFAULT_PREFERENCES } from '../../types/preferences'
import { FadingText } from '../ui/FadingText'
import { PrioritySlider } from '../ui/PrioritySlider'
import { TemperatureRangeGauge } from '../ui/TemperatureRangeGauge'
import type { PreferenceFactorId } from '../../utils/preferenceFactors'
import {
  getFactorBands,
  getFactorDefinition,
  getFactorLevelCopy,
  preferenceStepClass,
} from '../../utils/preferenceFactors'
import './PreferenceFactorRow.scss'

type Props = {
  factorId: PreferenceFactorId
  step: PreferenceStep
  onStepChange: (step: PreferenceStep) => void
  climateTempMinF?: number
  climateTempMaxF?: number
  onClimateTempChange?: (minF: number, maxF: number) => void
  withEnableToggle?: boolean
  enabled?: boolean
  onEnabledChange?: (enabled: boolean) => void
  readOnly?: boolean
  filterCrossRefNote?: React.ReactNode
}

export function PreferenceFactorRow({
  factorId,
  step,
  onStepChange,
  climateTempMinF,
  climateTempMaxF,
  onClimateTempChange,
  withEnableToggle = false,
  enabled = true,
  onEnabledChange,
  readOnly = false,
  filterCrossRefNote = null,
}: Props) {
  const def = getFactorDefinition(factorId)
  const level = getFactorLevelCopy(factorId, step)
  const stepClass = preferenceStepClass(step)
  const isActive = !withEnableToggle || enabled
  const isClimate = factorId === 'climate'
  const bands = getFactorBands(factorId)
  const resolvedClimateMinF = climateTempMinF ?? DEFAULT_PREFERENCES.climateTempMinF
  const resolvedClimateMaxF = climateTempMaxF ?? DEFAULT_PREFERENCES.climateTempMaxF
  const showClimateGauge = isClimate
  const showSlider = isActive || withEnableToggle

  return (
    <div
      className={[
        'pref-factor-row',
        withEnableToggle && 'pref-factor-row--with-toggle',
        !isActive && 'pref-factor-row--off',
        readOnly && 'pref-factor-row--readonly',
        isClimate && 'pref-factor-row--climate',
      ]
        .filter(Boolean)
        .join(' ')}
      data-wtr-pref-factor={factorId}
    >
      <div className="pref-factor-row__header">
        <div className="pref-factor-row__copy">
          <span className="pref-factor-row__name">{def.label}</span>
          {showSlider ? (
            <FadingText
              text={level.sub}
              className={[
                'pref-factor-row__helper',
                `pref-factor-row__helper--${stepClass}`,
              ].join(' ')}
            />
          ) : null}
        </div>

        {showSlider || (withEnableToggle && onEnabledChange) ? (
          <div className="pref-factor-row__aside">
            {showSlider ? (
              <span
                className={[
                  'pref-factor-row__score',
                  `pref-factor-row__score--${stepClass}`,
                  'tabular-nums',
                ].join(' ')}
                aria-label={`Priority ${step} out of 10`}
              >
                {step}
              </span>
            ) : null}
            {withEnableToggle && onEnabledChange ? (
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`Include ${def.label}`}
                className={[
                  'pref-factor-row__daily-toggle',
                  enabled && 'pref-factor-row__daily-toggle--on',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onEnabledChange(!enabled)}
              >
                <span className="pref-factor-row__daily-toggle-thumb" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {showSlider ? (
        <div
          className={[
            'pref-factor-row__controls',
            withEnableToggle && !isActive && 'pref-factor-row__controls--preview',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="pref-factor-row__control-section">
            {readOnly ? (
              <span
                className={[
                  'pref-factor-row__pill',
                  'pref-factor-row__pill--readonly',
                  `pref-factor-row__pill--${stepClass}`,
                ].join(' ')}
              >
                {level.badge} · {step}/10
              </span>
            ) : (
              <PrioritySlider
                value={step}
                onChange={(value) => onStepChange(value as PreferenceStep)}
                bands={bands}
                disabled={!isActive}
                ariaLabel={`${def.label} importance`}
              />
            )}
          </div>

          {showClimateGauge ? (
            <div className="pref-factor-row__control-section pref-factor-row__control-section--climate-temp">
              {readOnly ? (
                <span className="pref-factor-row__temp-readonly tabular-nums">
                  {resolvedClimateMinF}°F – {resolvedClimateMaxF}°F
                </span>
              ) : (
                <TemperatureRangeGauge
                  minF={resolvedClimateMinF}
                  maxF={resolvedClimateMaxF}
                  onChange={onClimateTempChange ?? (() => undefined)}
                  disabled={!isActive || onClimateTempChange == null}
                />
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {filterCrossRefNote}
    </div>
  )
}
