import { useMemo, useState } from 'react'
import { IconStethoscope } from '@tabler/icons-react'
import type { CityClimate } from '../../../lib/api/openMeteo'
import { formatTemp } from '../../../lib/api/openMeteo'
import type { PreferenceStep, RetirementPreferences } from '../../../types/preferences'
import { deriveClimateNotes } from '../../../utils/climateNotes'
import { deriveClimateDetail } from '../../../utils/climateDetail'
import { ClimateMonthlyChart } from '../ClimateMonthlyChart'
import { MonthlyPrecipChart } from '../MonthlyPrecipChart'
import { staggerSectionProps, type CityDetailTabStaggerProps } from './cityDetailTabUtils'
import './WeatherTab.scss'

type Props = CityDetailTabStaggerProps & {
  climate: CityClimate | null
  climatePreferenceStep: PreferenceStep
  climatePreferenceDirection: RetirementPreferences['climatePreference']
  climateTempMinF?: number
  climateTempMaxF?: number
  lat: number
  loading: boolean
  failed: boolean
}

function celsiusToFahrenheit(c: number): number {
  return c * (9 / 5) + 32
}

function formatDualTemp(celsius: number, primaryUnit: 'c' | 'f'): { primary: string; secondary: string } {
  if (primaryUnit === 'c') {
    return {
      primary: `${Math.round(celsius)}°C`,
      secondary: `${Math.round(celsiusToFahrenheit(celsius))}°F`,
    }
  }
  return {
    primary: `${Math.round(celsiusToFahrenheit(celsius))}°F`,
    secondary: `${Math.round(celsius)}°C`,
  }
}

function splitRetireeNote(note: string): { label: string; body: string } {
  const match = note.match(/^For retirees:\s*(.+)$/i)
  if (!match) return { label: '', body: note }
  return { label: 'For retirees:', body: match[1] }
}

function WeatherSkeleton({
  staggerClassName,
  staggerStyle,
}: Pick<Props, 'staggerClassName' | 'staggerStyle'>) {
  return (
    <article className="wtr-weather-tab wtr-weather-tab--loading" aria-busy="true" aria-label="Loading climate data">
      <div {...staggerSectionProps(0, 'wtr-weather-tab__skeleton-title', staggerClassName, staggerStyle)} />
      <div {...staggerSectionProps(1, 'wtr-weather-tab__skeleton-summary', staggerClassName, staggerStyle)} />
      <div {...staggerSectionProps(2, 'wtr-weather-tab__skeleton-metrics', staggerClassName, staggerStyle)}>
        <span />
        <span />
        <span />
        <span />
      </div>
      <div {...staggerSectionProps(3, 'wtr-weather-tab__skeleton-chart', staggerClassName, staggerStyle)} />
      <div {...staggerSectionProps(4, 'wtr-weather-tab__skeleton-chart', staggerClassName, staggerStyle)} />
    </article>
  )
}

type MetricColumnProps = {
  label: string
  primary: string
  secondary?: string | null
  primaryClassName?: string
  secondaryClassName?: string
}

function MetricColumn({
  label,
  primary,
  secondary,
  primaryClassName,
  secondaryClassName,
}: MetricColumnProps) {
  return (
    <div className="wtr-weather-tab__metric">
      <p className={['wtr-weather-tab__metric-primary tabular-nums', primaryClassName].filter(Boolean).join(' ')}>
        {primary}
      </p>
      <p className="wtr-weather-tab__metric-label">{label}</p>
      {secondary ? (
        <p className={['wtr-weather-tab__metric-secondary tabular-nums', secondaryClassName].filter(Boolean).join(' ')}>
          {secondary}
        </p>
      ) : null}
    </div>
  )
}

export function WeatherTab({
  climate,
  climatePreferenceStep,
  climatePreferenceDirection,
  climateTempMinF,
  climateTempMaxF,
  lat,
  loading,
  failed,
  staggerClassName,
  staggerStyle,
}: Props) {
  const [tempUnit, setTempUnit] = useState<'c' | 'f'>('c')

  const detail = useMemo(
    () => (climate ? deriveClimateDetail(climate, lat) : null),
    [climate, lat],
  )

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
    [climate, climatePreferenceStep, climatePreferenceDirection, climateTempMinF, climateTempMaxF],
  )

  if (failed) {
    return (
      <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--weather">
        <p
          role="status"
          {...staggerSectionProps(0, 'wtr-weather-tab__unavailable', staggerClassName, staggerStyle)}
        >
          Climate data unavailable
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--weather">
        <WeatherSkeleton staggerClassName={staggerClassName} staggerStyle={staggerStyle} />
      </div>
    )
  }

  if (!climate || !detail) return null

  const avgHigh = formatDualTemp(detail.metrics.avgHighC, tempUnit)
  const avgLow = formatDualTemp(detail.metrics.avgLowC, tempUnit)
  const retireeNote = splitRetireeNote(detail.retireeNote)
  const summaryBody =
    climatePreferenceStep > 0 && climateNotes
      ? climateNotes.matchSummary
      : detail.description
  const showFitScore = climateNotes?.climateScore != null && climatePreferenceStep > 0
  const summaryCardClassName = [
    'wtr-weather-tab__summary-card',
    climateNotes?.fitTone && climateNotes.fitTone !== 'muted'
      ? `wtr-weather-tab__summary-card--${climateNotes.fitTone}`
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  let staggerIdx = 0

  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--weather">
      <article className="wtr-weather-tab" aria-label="Climate and weather">
        <div {...staggerSectionProps(staggerIdx++, 'wtr-weather-tab__title-row', staggerClassName, staggerStyle)}>
          <div className="wtr-weather-tab__title-block">
            <h2 className="wtr-weather-tab__title">{detail.categoryLabel}</h2>
          </div>
          <div className="wtr-weather-tab__unit-toggle" role="group" aria-label="Temperature unit">
            <button
              type="button"
              className={`wtr-weather-tab__unit-btn${tempUnit === 'c' ? ' wtr-weather-tab__unit-btn--active' : ''}`}
              aria-pressed={tempUnit === 'c'}
              onClick={() => setTempUnit('c')}
            >
              °C
            </button>
            <button
              type="button"
              className={`wtr-weather-tab__unit-btn${tempUnit === 'f' ? ' wtr-weather-tab__unit-btn--active' : ''}`}
              aria-pressed={tempUnit === 'f'}
              onClick={() => setTempUnit('f')}
            >
              °F
            </button>
          </div>
        </div>

        <section
          aria-label="Climate match summary"
          {...staggerSectionProps(staggerIdx++, summaryCardClassName, staggerClassName, staggerStyle)}
        >
          <div className="wtr-weather-tab__summary-top">
            {showFitScore && climateNotes ? (
              <div className="wtr-weather-tab__fit-score" aria-label={`Climate fit score ${climateNotes.climateScore} out of 100`}>
                <span className="wtr-weather-tab__fit-score-value tabular-nums">{climateNotes.climateScore}</span>
              </div>
            ) : null}
            <p className="wtr-weather-tab__summary-copy">{summaryBody}</p>
          </div>
          <div className="wtr-weather-tab__summary-divider" aria-hidden />
          <div className="wtr-weather-tab__summary-retiree">
            <IconStethoscope size={16} stroke={1.5} aria-hidden />
            <p>
              {retireeNote.label ? (
                <strong className="wtr-weather-tab__retiree-label">{retireeNote.label}</strong>
              ) : null}
              {retireeNote.label ? ' ' : null}
              {retireeNote.body}
            </p>
          </div>
        </section>

        <section
          aria-label="Climate averages"
          {...staggerSectionProps(
            staggerIdx++,
            'wtr-weather-tab__metrics-card',
            staggerClassName,
            staggerStyle,
          )}
        >
          <div className="wtr-weather-tab__metrics">
            <MetricColumn label="Avg high" primary={avgHigh.primary} secondary={avgHigh.secondary} />
            <MetricColumn label="Avg low" primary={avgLow.primary} secondary={avgLow.secondary} />
            <MetricColumn
              label="Avg humidity"
              primary={
                detail.metrics.avgHumidityPct != null ? `${detail.metrics.avgHumidityPct}%` : '—'
              }
              secondary={detail.metrics.humidityLabel}
              primaryClassName={
                detail.metrics.humidityLabel === 'Oppressive'
                  ? 'wtr-weather-tab__metric-primary--warning'
                  : undefined
              }
              secondaryClassName={
                detail.metrics.humidityLabel === 'Oppressive'
                  ? 'wtr-weather-tab__metric-secondary--warning'
                  : undefined
              }
            />
            <MetricColumn
              label="Rainy months"
              primary={`${detail.metrics.rainyMonthCount}`}
              secondary={detail.metrics.rainyMonthRange}
            />
          </div>
        </section>

        <section
          aria-labelledby="wtr-weather-chart-heading"
          {...staggerSectionProps(
            staggerIdx++,
            'wtr-weather-tab__chart-card',
            staggerClassName,
            staggerStyle,
          )}
        >
          <div className="wtr-weather-tab__section-header">
            <h3 className="wtr-weather-tab__section-title" id="wtr-weather-chart-heading">
              Monthly temperatures
            </h3>
            <p className="wtr-weather-tab__section-helper">
              Avg highs {formatTemp(Math.max(...climate.monthly.map((m) => m.avgHighC)), tempUnit)} / lows{' '}
              {formatTemp(Math.min(...climate.monthly.map((m) => m.avgLowC)), tempUnit)} · climate normals
              2011–2020 (NASA POWER)
            </p>
          </div>
          <ClimateMonthlyChart
            monthly={climate.monthly}
            lat={lat}
            seasons={detail.seasons}
            tempUnit={tempUnit}
            climatePreferenceStep={climatePreferenceStep}
            climatePreferenceDirection={climatePreferenceDirection}
          />
        </section>

        <section
          aria-labelledby="wtr-weather-precip-heading"
          {...staggerSectionProps(
            staggerIdx++,
            'wtr-weather-tab__chart-card',
            staggerClassName,
            staggerStyle,
          )}
        >
          <div className="wtr-weather-tab__section-header">
            <h3 className="wtr-weather-tab__section-title" id="wtr-weather-precip-heading">
              Monthly precipitation
            </h3>
            <p className="wtr-weather-tab__section-helper">
              Monthly totals from daily averages · climate normals 2011–2020 (NASA POWER)
            </p>
          </div>
          <MonthlyPrecipChart monthly={climate.monthly} />
        </section>
      </article>
    </div>
  )
}
