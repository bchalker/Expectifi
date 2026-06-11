import { memo } from 'react'
import { CloseButton } from '@heroui/react'
import { IconThumbUpFilled, IconWallet } from '@tabler/icons-react'
import {
  countryToFlagEmoji,
  formatUsd,
} from '../../../utils/costOfLiving'
import { scoreDetailBandFromScore } from '../../../utils/retirementScore'
import type { RetirementScoreResult } from '../../../utils/retirementScore'

export type CityDetailPanelHeaderProps = {
  cityName: string
  country: string
  panelMonthlyBudget: number
  monthlySurplus: number
  headerScore: RetirementScoreResult
  onClose?: () => void
  showClose?: boolean
}

export const CityDetailPanelHeader = memo(function CityDetailPanelHeader({
  cityName,
  country,
  panelMonthlyBudget,
  monthlySurplus,
  headerScore,
  onClose,
  showClose = true,
}: CityDetailPanelHeaderProps) {
  const flagEmoji = countryToFlagEmoji(country)
  const fitScore = Math.max(0, Math.min(100, Math.round(headerScore.displayScore)))
  const { band: scoreBand, label: scoreBandLabel } = scoreDetailBandFromScore(fitScore)

  return (
    <header className="wtr-city-detail__header" aria-label="Destination summary">
      <div className="wtr-city-detail__hero-row">
        <div
          className={[
            'wtr-city-detail__fit-score',
            `wtr-city-detail__fit-score--${scoreBand}`,
          ].join(' ')}
          aria-label={`Retirement fit score ${fitScore} out of 100, ${scoreBandLabel}`}
        >
          <div className="wtr-city-detail__fit-score-value-row">
            <p className="wtr-city-detail__fit-score-value tabular-nums">{fitScore}</p>
            {scoreBand === 'exceptional' ? (
              <IconThumbUpFilled
                className="wtr-city-detail__fit-score-thumb"
                size={18}
                aria-hidden
              />
            ) : null}
          </div>
          <p className="wtr-city-detail__fit-score-caption">Fit score</p>
          <p className="wtr-city-detail__fit-score-label">{scoreBandLabel}</p>
        </div>

        <div className="wtr-city-detail__identity">
          <h2 id="wtr-dest-panel-title" className="wtr-city-detail__name">
            {cityName}
          </h2>
          <div className="wtr-city-detail__country-line">
            <span className="wtr-city-detail__flag" aria-hidden>
              {flagEmoji}
            </span>
            <p className="wtr-city-detail__country">{country}</p>
          </div>
        </div>

        <div className="wtr-city-detail__cost-block">
          <p className="wtr-city-detail__cost-total tabular-nums">
            {formatUsd(panelMonthlyBudget)}
            <span className="wtr-city-detail__cost-period">/mo</span>
          </p>
          {monthlySurplus > 0 ? (
            <span className="wtr-city-detail__surplus-badge tabular-nums">
              <IconWallet size={14} stroke={1.5} aria-hidden />
              {formatUsd(monthlySurplus)} surplus
            </span>
          ) : null}
        </div>

        {showClose && onClose ? (
          <div className="wtr-city-detail__close-zone">
            <CloseButton
              className="panel-close-btn wtr-city-detail__close"
              aria-label="Close destination details"
              onPress={onClose}
            />
          </div>
        ) : null}
      </div>
    </header>
  )
})
