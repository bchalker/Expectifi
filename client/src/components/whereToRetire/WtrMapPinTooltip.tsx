import type { CSSProperties } from 'react'
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react'
import type { MapFilters, ScoredMapCity } from '../../lib/whereToRetire/cityMapScoring'
import {
  mapIncomeFitDisplayForCity,
  monthlyOutflowForMapCity,
} from '../../lib/whereToRetire/mapIncomeFit'
import type { MapPinColorView, MapPinDisplay } from '../../lib/whereToRetire/mapPinDisplay'
import {
  formatUsd,
  hasTravelAdvisory,
} from '../../utils/costOfLiving'
import { hasReconsiderTravelAdvisory } from '../../lib/travelAdvisories'
import { WtrTravelAdvisoryCautionChip } from './WtrTravelAdvisoryCautionChip'
import {
  formatEstimatedAmericans,
  getExpatDestinationInfo,
  isDomesticRetirementDestination,
} from '../../utils/expatInfo'
import { getFitScoreColors } from '../../utils/fitScore'
import { CountryFlag } from '../ui/CountryFlag'
import './RetirementDestinationCard.scss'
import './WtrMapPinLegend.scss'
import './WtrMapPinTooltip.scss'

type Props = {
  scored: ScoredMapCity
  display: MapPinDisplay
  monthlyIncome: number
  pinColorView: MapPinColorView
  filters: Pick<MapFilters, 'lifestyle'>
}

export function WtrMapPinTooltip({
  scored,
  display,
  monthlyIncome,
  pinColorView,
  filters,
}: Props) {
  const { city } = scored
  const { displayScore: badgeScore, bandClass, pinColor, bandLabel } = display
  const fitBadgeColors = getFitScoreColors(badgeScore)
  const showAdvisory = hasTravelAdvisory(city.country)
  const showCaution = hasReconsiderTravelAdvisory(city.country)
  const incomeFit = mapIncomeFitDisplayForCity(
    city.city,
    city.country,
    monthlyIncome,
    filters,
  )

  const expatInfo =
    pinColorView === 'expat' ? getExpatDestinationInfo(city.country) : null
  const americansNote =
    pinColorView === 'expat' &&
    expatInfo &&
    !isDomesticRetirementDestination(city.country)
      ? formatEstimatedAmericans(expatInfo.estimated_americans)
      : null

  const monthlyCost = monthlyOutflowForMapCity(scored, monthlyIncome, filters)
  const monthlySurplus =
    monthlyCost != null ? Math.max(0, monthlyIncome - monthlyCost) : null
  const showMonthlyStat =
    (pinColorView === 'budget' || pinColorView === 'score') &&
    monthlyCost != null &&
    Number.isFinite(monthlyCost)

  return (
    <div className="wtr-pin-tooltip">
      <div
        className={[
          'wtr-dest-card',
          'wtr-pin-tooltip-card',
          `wtr-dest-card--${bandClass}`,
        ].join(' ')}
      >
      <div className="wtr-dest-card__top">
        <div className="wtr-dest-card__body">
          <div className="wtr-dest-card__head-row">
            <div className="wtr-dest-card__identity">
              <span className="wtr-dest-card__name">{city.city}</span>
              <span className="wtr-dest-card__country">
                <CountryFlag country={city.country} size="s" className="wtr-dest-card__flag" />
                <span className="wtr-dest-card__country-name">{city.country}</span>
              </span>
            </div>

            {showMonthlyStat ? (
              <span className="wtr-dest-card__budget-stat">
                <span className="wtr-dest-card__budget-amount tabular-nums">
                  {formatUsd(monthlyCost)}
                  <span className="wtr-dest-card__budget-suffix">/mo</span>
                </span>
                {pinColorView === 'budget' &&
                monthlySurplus != null &&
                monthlySurplus > 0 ? (
                  <span className="wtr-dest-card__budget-surplus tabular-nums">
                    + {formatUsd(monthlySurplus)}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>

          {pinColorView === 'expat' ? (
            <span className="wtr-dest-card__expat-badge-row">
              <span className="wtr-map-pin-legend__item">
                <span
                  className="wtr-map-pin-legend__dot"
                  style={{ background: pinColor }}
                  aria-hidden
                />
                <span className="wtr-map-pin-legend__label">{bandLabel}</span>
              </span>
              {americansNote ? (
                <span className="wtr-dest-card__expat-count">{americansNote}</span>
              ) : null}
            </span>
          ) : null}

          {incomeFit ? (
            <div className="wtr-dest-card__meta font-xs">
              <span className="wtr-dest-card__meta-visa">
                {incomeFit.visaQualifies ? (
                  <IconCheck
                    className="wtr-dest-card__meta-visa-icon"
                    size={14}
                    stroke={2}
                    aria-hidden
                  />
                ) : null}
                {incomeFit.visaLabel}
              </span>
              <span className="wtr-dest-card__meta-tax">{incomeFit.taxLabel}</span>
              {showCaution ? (
                <WtrTravelAdvisoryCautionChip country={city.country} />
              ) : null}
            </div>
          ) : showCaution ? (
            <div className="wtr-dest-card__meta font-xs">
              <WtrTravelAdvisoryCautionChip country={city.country} />
            </div>
          ) : null}

          {showAdvisory ? (
            <span className="wtr-dest-card__advisory-footer">
              <IconAlertTriangle size={14} stroke={1.5} aria-hidden />
              Travel advisory
            </span>
          ) : null}
        </div>

        {pinColorView === 'score' ? (
          <div
            className="wtr-dest-card__fit-col"
            style={
              {
                '--wtr-fit-col-bg': fitBadgeColors.background,
                '--wtr-fit-score-color': fitBadgeColors.text,
              } as CSSProperties
            }
          >
            <span className="wtr-dest-card__fit-sep" aria-hidden />
            <div className="wtr-dest-card__fit-stack">
              <span
                className="wtr-dest-card__fit-badge tabular-nums"
                aria-label={`Fit score ${badgeScore} out of 100`}
              >
                {badgeScore}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
      <span className="wtr-pin-tooltip__arrow" aria-hidden />
    </div>
  )
}
