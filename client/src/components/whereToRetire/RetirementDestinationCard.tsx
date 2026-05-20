import type { CSSProperties, KeyboardEvent } from 'react'
import { IconAlertTriangle } from '@tabler/icons-react'
import type { ScoredMapCity } from '../../lib/whereToRetire/cityMapScoring'
import { countryToFlagEmoji, hasTravelAdvisory } from '../../utils/costOfLiving'
import { WtrAffordabilityScoreBar } from './WtrAffordabilityScoreBar'
import { WtrCompareToggleButton } from './WtrCompareToggleButton'
import './RetirementDestinationCard.scss'

type Props = {
  scored: ScoredMapCity
  rank: number
  active: boolean
  staggerIndex?: number
  onSelect: () => void
  showCompareToggle?: boolean
  compareSelected?: boolean
  compareAtMax?: boolean
  onToggleCompare?: () => void
}

export function RetirementDestinationCard({
  scored,
  rank,
  active,
  staggerIndex,
  onSelect,
  showCompareToggle = false,
  compareSelected = false,
  compareAtMax = false,
  onToggleCompare,
}: Props) {
  const { city, affordabilityScore, tier } = scored
  const showAdvisory = hasTravelAdvisory(city.country)

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={[
        'wtr-dest-card',
        active && 'wtr-dest-card--active',
        showCompareToggle && 'wtr-dest-card--has-compare',
        `wtr-dest-card--${tier}`,
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        staggerIndex != null
          ? ({ '--wtr-card-i': staggerIndex } as CSSProperties)
          : undefined
      }
      onClick={onSelect}
      onKeyDown={handleCardKeyDown}
      aria-pressed={active}
    >
      {showCompareToggle && onToggleCompare ? (
        <WtrCompareToggleButton
          className="wtr-compare-corner--card"
          selected={compareSelected}
          atMax={compareAtMax}
          cityName={city.city}
          onToggle={onToggleCompare}
        />
      ) : null}
      <div className="wtr-dest-card__top">
        <span className="wtr-dest-card__rank" aria-hidden>
          {rank}
        </span>
        <span className="wtr-dest-card__flag" aria-hidden>
          {countryToFlagEmoji(city.country)}
        </span>
        <span className="wtr-dest-card__body">
          <span className="wtr-dest-card__name-row">
            <span className="wtr-dest-card__name">{city.city}</span>
            {showAdvisory ? (
              <span className="wtr-dest-card__advisory-badge">
                <IconAlertTriangle size={14} stroke={1.5} aria-hidden />
                Travel advisory
              </span>
            ) : null}
          </span>
          <span className="wtr-dest-card__region">{city.country}</span>
          <WtrAffordabilityScoreBar
            score={affordabilityScore}
            tier={tier}
            className="wtr-dest-card__score"
          />
        </span>
      </div>
    </div>
  )
}
