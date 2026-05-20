import { useState } from 'react'
import { IconSun } from '@tabler/icons-react'
import type { CityClimate } from '../../lib/api/openMeteo'
import { formatTemp } from '../../lib/api/openMeteo'
import './ClimateCard.scss'

type Props = {
  climate: CityClimate | null
  loading: boolean
  failed: boolean
}

function monthBarHeight(value: number, min: number, max: number): number {
  if (max <= min) return 50
  return 12 + ((value - min) / (max - min)) * 88
}

export function ClimateCard({ climate, loading, failed }: Props) {
  const [tempUnit, setTempUnit] = useState<'c' | 'f'>('f')

  if (failed) {
    return (
      <p className="wtr-climate-card__unavailable" role="status">
        Climate data unavailable
      </p>
    )
  }

  if (loading) {
    return (
      <article className="wtr-climate-card wtr-climate-card--loading" aria-busy="true" aria-label="Loading climate data">
        <div className="wtr-climate-card__skeleton-head" />
        <div className="wtr-climate-card__skeleton-bars">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="wtr-climate-card__skeleton-bar" />
          ))}
        </div>
        <div className="wtr-climate-card__skeleton-rows">
          <span />
          <span />
          <span />
        </div>
      </article>
    )
  }

  if (!climate) return null

  const tempMin = Math.min(...climate.monthly.map((m) => m.avgLowC))
  const tempMax = Math.max(...climate.monthly.map((m) => m.avgHighC))

  return (
    <article className="wtr-climate-card" aria-label="Typical climate">
      <header className="wtr-climate-card__head">
        <span className="wtr-climate-card__icon" aria-hidden>
          <IconSun size={24} stroke={1.5} />
        </span>
        <div className="wtr-climate-card__head-copy">
          <h4 className="wtr-climate-card__title">Typical Climate</h4>
          <p className="wtr-climate-card__label">{climate.climateLabel}</p>
        </div>
        <div className="wtr-climate-card__unit-toggle" role="group" aria-label="Temperature unit">
          <button
            type="button"
            className={`wtr-climate-card__unit-btn${tempUnit === 'f' ? ' wtr-climate-card__unit-btn--active' : ''}`}
            aria-pressed={tempUnit === 'f'}
            onClick={() => setTempUnit('f')}
          >
            °F
          </button>
          <button
            type="button"
            className={`wtr-climate-card__unit-btn${tempUnit === 'c' ? ' wtr-climate-card__unit-btn--active' : ''}`}
            aria-pressed={tempUnit === 'c'}
            onClick={() => setTempUnit('c')}
          >
            °C
          </button>
        </div>
      </header>

      <div className="wtr-climate-card__chart" aria-hidden>
        {climate.monthly.map((month) => {
          const lowPct = monthBarHeight(month.avgLowC, tempMin, tempMax)
          const highPct = monthBarHeight(month.avgHighC, tempMin, tempMax)
          return (
            <div key={month.month} className="wtr-climate-card__month">
              <div className="wtr-climate-card__bar-wrap">
                <div
                  className="wtr-climate-card__bar"
                  style={{ bottom: `${lowPct}%`, height: `${Math.max(4, highPct - lowPct)}%` }}
                />
              </div>
              <span className="wtr-climate-card__month-label">{month.monthLabel}</span>
            </div>
          )
        })}
      </div>

      <dl className="wtr-climate-card__stats">
        <div className="wtr-climate-card__stat">
          <dt>Annual average</dt>
          <dd>{formatTemp(climate.annualAvgTempC, tempUnit)}</dd>
        </div>
        <div className="wtr-climate-card__stat">
          <dt>Wettest month</dt>
          <dd>{climate.wettestMonth}</dd>
        </div>
        <div className="wtr-climate-card__stat">
          <dt>Driest month</dt>
          <dd>{climate.driestMonth}</dd>
        </div>
      </dl>

      <p className="wtr-climate-card__range-note">
        Monthly avg. highs{' '}
        {formatTemp(Math.max(...climate.monthly.map((m) => m.avgHighC)), tempUnit)} / lows{' '}
        {formatTemp(Math.min(...climate.monthly.map((m) => m.avgLowC)), tempUnit)} (1990–2020)
      </p>
    </article>
  )
}
