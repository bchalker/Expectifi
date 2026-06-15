import { memo } from 'react'
import { CloseButton } from '@heroui/react'
import { IconForbid, IconPlus, IconThumbUpFilled } from '@tabler/icons-react'
import {
  formatUsd,
} from '../../../utils/costOfLiving'
import { getFitScoreColors } from '../../../utils/fitScore'
import { scoreDetailBandFromScore } from '../../../utils/retirementScore'
import type { RetirementScoreResult } from '../../../utils/retirementScore'
import { CountryFlag } from '../../ui/CountryFlag'
import { Tooltip } from '../../Tooltip'
import { EXCLUDE_COUNTRY_TOOLTIP } from '../WtrExcludeCountryIcon'

export type CityDetailPanelHeaderProps = {
  cityName: string
  country: string
  panelMonthlyBudget: number
  monthlySurplus: number
  headerScore: RetirementScoreResult
  onClose?: () => void
  showClose?: boolean
  onExcludeCountry?: () => void
  countryExcluded?: boolean
}

export const CityDetailPanelHeader = memo(function CityDetailPanelHeader({
  cityName,
  country,
  panelMonthlyBudget,
  monthlySurplus,
  headerScore,
  onClose,
  showClose = true,
  onExcludeCountry,
  countryExcluded = false,
}: CityDetailPanelHeaderProps) {
  const fitScore = Math.max(0, Math.min(100, Math.round(headerScore.displayScore)))
  const { band: scoreBand, label: scoreBandLabel } = scoreDetailBandFromScore(fitScore)
  const fitScoreColors = getFitScoreColors(fitScore)

  return (
    <header className="wtr-city-detail__header" aria-label="Destination summary">
      <div className="wtr-city-detail__header-group">
        <div className="wtr-city-detail__fit-score-wrap">
          <div
            className="wtr-city-detail__fit-score"
            style={{
              backgroundColor: fitScoreColors.background,
              color: fitScoreColors.text,
            }}
            aria-label={`Retirement fit score ${fitScore} out of 100, ${scoreBandLabel}`}
          >
            <div className="wtr-city-detail__fit-score-value-row">
              <p className="wtr-city-detail__fit-score-value tabular-nums">
                <span className="wtr-city-detail__fit-score-number">{fitScore}</span>
              </p>
              {scoreBand === 'exceptional' ? (
                <IconThumbUpFilled
                  className="wtr-city-detail__fit-score-thumb"
                  size={18}
                  aria-hidden
                />
              ) : null}
            </div>
            <p className="wtr-city-detail__fit-score-caption">Fit</p>
            <p className="wtr-city-detail__fit-score-label">{scoreBandLabel}</p>
          </div>
        </div>

        <div className="wtr-city-detail__identity">
          <h2 id="wtr-dest-panel-title" className="wtr-city-detail__name">
            {cityName}
          </h2>
          <div className="wtr-city-detail__country-line">
            <CountryFlag country={country} size="s" className="wtr-city-detail__flag" />
            <p className="wtr-city-detail__country">{country}</p>
            {onExcludeCountry ? (
              <Tooltip
                content={
                  countryExcluded
                    ? `${country} is excluded from results`
                    : EXCLUDE_COUNTRY_TOOLTIP
                }
                placement="bottom"
                triggerClassName="wtr-city-detail__country-forbid-tip"
              >
                <span
                  className={[
                    'wtr-city-detail__country-forbid',
                    countryExcluded && 'wtr-city-detail__country-forbid--active',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={
                    countryExcluded
                      ? `${country} is excluded from results`
                      : EXCLUDE_COUNTRY_TOOLTIP
                  }
                  onClick={
                    countryExcluded
                      ? undefined
                      : (e) => {
                          e.stopPropagation()
                          onExcludeCountry()
                        }
                  }
                >
                  <IconForbid size={16} stroke={1.5} aria-hidden />
                </span>
              </Tooltip>
            ) : null}
          </div>
        </div>

        <div className="wtr-city-detail__cost-block">
          <p className="wtr-city-detail__cost-total tabular-nums">
            {formatUsd(panelMonthlyBudget)}
            <span className="wtr-city-detail__cost-period">/mo</span>
          </p>
          {monthlySurplus > 0 ? (
            <span className="wtr-city-detail__surplus tabular-nums">
              <IconPlus size={14} stroke={1.5} aria-hidden />
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
