import { IconArrowRight } from '@tabler/icons-react'
import type { PreferenceStep } from '../../types/preferences'
import { formatClimateTempRange, isClimateTempRangeUnset } from '../../types/preferences'
import type { PreferenceFactorId } from '../../utils/preferenceFactors'
import { getFactorDefinition, preferenceStepClass } from '../../utils/preferenceFactors'
import './PreferenceReviewRow.scss'

type Props = {
  factorId: PreferenceFactorId
  step: PreferenceStep
  climateTempMinF?: number
  climateTempMaxF?: number
  onNavigate?: (factorId: PreferenceFactorId) => void
}

export function PreferenceReviewRow({
  factorId,
  step,
  climateTempMinF,
  climateTempMaxF,
  onNavigate,
}: Props) {
  const def = getFactorDefinition(factorId)
  const stepClass = preferenceStepClass(step)
  const isClimate = factorId === 'climate'
  const showClimateRange =
    isClimate &&
    climateTempMinF != null &&
    climateTempMaxF != null &&
    !isClimateTempRangeUnset(climateTempMinF, climateTempMaxF)
  const canNavigate = onNavigate != null

  const handleNavigate = () => {
    onNavigate?.(factorId)
  }

  return (
    <div className={['pref-review-row', canNavigate && 'pref-review-row--clickable'].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="pref-review-row__name-btn"
        onClick={canNavigate ? handleNavigate : undefined}
        disabled={!canNavigate}
      >
        {def.label}
      </button>
      <div className="pref-review-row__selection">
        {showClimateRange ? (
          <>
            <button
              type="button"
              className={[
                'pref-review-row__badge',
                'pref-review-row__badge-btn',
                'pref-review-row__badge--temp',
              ].join(' ')}
              onClick={canNavigate ? handleNavigate : undefined}
              disabled={!canNavigate}
            >
              {formatClimateTempRange(climateTempMinF, climateTempMaxF)}
            </button>
            <IconArrowRight
              className="pref-review-row__arrow"
              size={12}
              stroke={1.5}
              aria-hidden
            />
          </>
        ) : null}
        <button
          type="button"
          className={[
            'pref-review-row__badge',
            'pref-review-row__badge-btn',
            `pref-review-row__badge--${stepClass}`,
          ].join(' ')}
          onClick={canNavigate ? handleNavigate : undefined}
          disabled={!canNavigate}
        >
          {step}/10
        </button>
      </div>
    </div>
  )
}
