import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { IconSun } from '@tabler/icons-react'
import type { CityClimate } from '../../lib/api/openMeteo'
import { formatTemp } from '../../lib/api/openMeteo'
import type { ClimatePreferenceDirection, PreferenceStep } from '../../types/preferences'
import { deriveClimateDetail } from '../../utils/climateDetail'
import { deriveClimateNotes } from '../../utils/climateNotes'
import { ClimateMonthlyChart } from './ClimateMonthlyChart'
import './ClimateCard.scss'

type Props = {
  climate: CityClimate | null
  lat?: number
  climatePreferenceStep?: PreferenceStep
  climatePreferenceDirection?: ClimatePreferenceDirection
  climateTempMinF?: number
  climateTempMaxF?: number
  loading: boolean
  failed: boolean
  staggerClassName?: string
  staggerStyle?: (index: number) => CSSProperties
}

function staggerSectionProps(
  index: number,
  baseClass: string | undefined,
  staggerClassName: string | undefined,
  staggerStyle: ((index: number) => CSSProperties) | undefined,
): { className?: string; style?: CSSProperties } {
  if (!staggerClassName || !staggerStyle) {
    return baseClass ? { className: baseClass } : {}
  }
  return {
    className: baseClass ? `${baseClass} ${staggerClassName}` : staggerClassName,
    style: staggerStyle(index),
  }
}

function StaggerSection({
  index,
  baseClass,
  staggerClassName,
  staggerStyle,
  children,
}: {
  index: number
  baseClass?: string
  staggerClassName?: string
  staggerStyle?: (index: number) => CSSProperties
  children: ReactNode
}) {
  const props = staggerSectionProps(index, baseClass, staggerClassName, staggerStyle)
  return <div {...props}>{children}</div>
}

export function ClimateCard({
  climate,
  lat = 0,
  climatePreferenceStep = 0,
  climatePreferenceDirection = 'none',
  climateTempMinF,
  climateTempMaxF,
  loading,
  failed,
  staggerClassName,
  staggerStyle,
}: Props) {
  const [tempUnit, setTempUnit] = useState<'c' | 'f'>('f')
  const climateNotes = useMemo(
    () =>
      climate
        ? deriveClimateNotes(
            climate,
            climatePreferenceStep,
            climatePreferenceDirection,
            climateTempMinF,
            climateTempMaxF,
          )
        : null,
    [
      climate,
      climatePreferenceStep,
      climatePreferenceDirection,
      climateTempMinF,
      climateTempMaxF,
    ],
  )
  const climateDetail = useMemo(
    () => (climate ? deriveClimateDetail(climate, lat) : null),
    [climate, lat],
  )

  if (failed) {
    return (
      <p
        role="status"
        {...staggerSectionProps(0, 'wtr-climate-card__unavailable', staggerClassName, staggerStyle)}
      >
        Climate data unavailable
      </p>
    )
  }

  if (loading) {
    return (
      <article
        className="wtr-climate-card wtr-climate-card--loading"
        aria-busy="true"
        aria-label="Loading climate data"
      >
        <StaggerSection
          index={0}
          staggerClassName={staggerClassName}
          staggerStyle={staggerStyle}
        >
          <div className="wtr-climate-card__skeleton-head" />
        </StaggerSection>
        <StaggerSection
          index={1}
          staggerClassName={staggerClassName}
          staggerStyle={staggerStyle}
        >
          <div className="wtr-climate-card__skeleton-bars">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="wtr-climate-card__skeleton-bar" />
            ))}
          </div>
        </StaggerSection>
        <StaggerSection
          index={2}
          staggerClassName={staggerClassName}
          staggerStyle={staggerStyle}
        >
          <div className="wtr-climate-card__skeleton-rows">
            <span />
            <span />
            <span />
          </div>
        </StaggerSection>
      </article>
    )
  }

  if (!climate) return null

  return (
    <article className="wtr-climate-card" aria-label="Typical climate">
      <header {...staggerSectionProps(0, 'wtr-climate-card__head', staggerClassName, staggerStyle)}>
        <span className="wtr-climate-card__icon" aria-hidden>
          <IconSun size={36} stroke={1.5} />
        </span>
        <div className="wtr-climate-card__head-copy">
          <h4 className="wtr-city-detail__section-title wtr-climate-card__title">Typical Climate</h4>
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

      {climateNotes ? (
        <p
          {...staggerSectionProps(
            1,
            [
              'wtr-climate-card__notes',
              climateNotes.fitTone !== 'muted' &&
                `wtr-climate-card__notes--${climateNotes.fitTone}`,
            ]
              .filter(Boolean)
              .join(' '),
            staggerClassName,
            staggerStyle,
          )}
        >
          {climateNotes.climateScore != null && climatePreferenceStep > 0 ? (
            <span className="wtr-climate-card__notes-score tabular-nums">
              {climateNotes.climateScore}/100
            </span>
          ) : null}
          {climateNotes.climateNotes}
        </p>
      ) : null}

      <div {...staggerSectionProps(2, 'wtr-climate-card__chart', staggerClassName, staggerStyle)}>
        <ClimateMonthlyChart
          monthly={climate.monthly}
          lat={lat}
          seasons={climateDetail?.seasons ?? []}
          tempUnit={tempUnit}
          climatePreferenceStep={climatePreferenceStep}
          climatePreferenceDirection={climatePreferenceDirection}
        />
      </div>

      <dl {...staggerSectionProps(3, 'wtr-climate-card__stats', staggerClassName, staggerStyle)}>
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

      <p {...staggerSectionProps(4, 'wtr-climate-card__range-note', staggerClassName, staggerStyle)}>
        Monthly avg. highs{' '}
        {formatTemp(Math.max(...climate.monthly.map((m) => m.avgHighC)), tempUnit)} / lows{' '}
        {formatTemp(Math.min(...climate.monthly.map((m) => m.avgLowC)), tempUnit)} (1990–2020)
      </p>
    </article>
  )
}
