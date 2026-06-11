import { IconArrowRight } from '@tabler/icons-react'
import type { ClimatePreferenceDirection, PreferenceStep } from '../../types/preferences'
import {
  climateDirectionPillClass,
  climateDirectionShortLabel,
} from '../../utils/climatePreferenceCopy'
import type { PreferenceFactorId } from '../../utils/preferenceFactors'
import {
  getFactorDefinition,
  getFactorLevelCopy,
  preferenceStepClass,
} from '../../utils/preferenceFactors'
import './PreferenceReviewRow.scss'

type Props = {
  factorId: PreferenceFactorId
  step: PreferenceStep
  climatePreference?: ClimatePreferenceDirection
}

export function PreferenceReviewRow({ factorId, step, climatePreference }: Props) {
  const def = getFactorDefinition(factorId)
  const level = getFactorLevelCopy(factorId, step)
  const stepClass = preferenceStepClass(step)
  const isClimate = factorId === 'climate'
  const direction = climatePreference ?? 'none'
  const showClimateDirection = isClimate && direction !== 'none'

  return (
    <div className="pref-review-row">
      <span className="pref-review-row__name">{def.label}</span>
      <div className="pref-review-row__selection">
        {showClimateDirection ? (
          <>
            <span
              className={[
                'pref-review-row__badge',
                climateDirectionPillClass(direction),
              ].join(' ')}
            >
              {climateDirectionShortLabel(direction)}
            </span>
            <IconArrowRight
              className="pref-review-row__arrow"
              size={12}
              stroke={1.5}
              aria-hidden
            />
          </>
        ) : null}
        <span className={`pref-review-row__badge pref-review-row__badge--${stepClass}`}>
          {level.badge}
        </span>
      </div>
    </div>
  )
}
