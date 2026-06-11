import { useMemo, useState } from 'react'
import {
  IconCloudRain,
  IconDroplet,
  IconFlame,
  IconInfoCircle,
  IconSnowflake,
  IconSun,
  IconUsers,
} from '@tabler/icons-react'
import type { CityClimate } from '../../../lib/api/openMeteo'
import { formatTemp } from '../../../lib/api/openMeteo'
import type { PreferenceStep, RetirementPreferences } from '../../../types/preferences'
import { deriveClimateNotes } from '../../../utils/climateNotes'
import {
  deriveClimateDetail,
  formatTempRange,
  type ClimateConsiderationTone,
  type ClimateTagTone,
} from '../../../utils/climateDetail'
import { ClimateMonthlyChart } from '../ClimateMonthlyChart'
import { staggerSectionProps, type CityDetailTabStaggerProps } from './cityDetailTabUtils'
import './WeatherTab.scss'

type Props = CityDetailTabStaggerProps & {
  climate: CityClimate | null
  climatePreferenceStep: PreferenceStep
  climatePreferenceDirection: RetirementPreferences['climatePreference']
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

function ClimateTagIcon({ tone }: { tone: ClimateTagTone }) {
  const props = { size: 14, stroke: 1.5, 'aria-hidden': true as const }
  switch (tone) {
    case 'humidity':
      return <IconDroplet {...props} />
    case 'heat':
      return <IconFlame {...props} />
    case 'cold':
      return <IconSnowflake {...props} />
    case 'rain':
      return <IconCloudRain {...props} />
    default:
      return <IconSun {...props} />
  }
}

function ConsiderationIcon({ tone }: { tone: ClimateConsiderationTone }) {
  const props = { size: 16, stroke: 1.5, 'aria-hidden': true as const }
  switch (tone) {
    case 'danger':
      return <IconFlame {...props} />
    case 'warning':
      return <IconSun {...props} />
    case 'info':
      return <IconCloudRain {...props} />
    default:
      return <IconDroplet {...props} />
  }
}

function WeatherSkeleton({
  staggerClassName,
  staggerStyle,
}: Pick<Props, 'staggerClassName' | 'staggerStyle'>) {
  return (
    <article className="wtr-weather-tab wtr-weather-tab--loading" aria-busy="true" aria-label="Loading climate data">
      <div {...staggerSectionProps(0, 'wtr-weather-tab__skeleton-title', staggerClassName, staggerStyle)} />
      <div {...staggerSectionProps(1, 'wtr-weather-tab__skeleton-tags', staggerClassName, staggerStyle)} />
      <div {...staggerSectionProps(2, 'wtr-weather-tab__skeleton-callout', staggerClassName, staggerStyle)} />
      <div {...staggerSectionProps(3, 'wtr-weather-tab__skeleton-metrics', staggerClassName, staggerStyle)}>
        <span />
        <span />
        <span />
      </div>
      <div {...staggerSectionProps(4, 'wtr-weather-tab__skeleton-seasons', staggerClassName, staggerStyle)}>
        <span />
        <span />
        <span />
        <span />
      </div>
    </article>
  )
}

export function WeatherTab({
  climate,
  climatePreferenceStep,
  climatePreferenceDirection,
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
        ? deriveClimateNotes(climate, climatePreferenceStep, climatePreferenceDirection)
        : null,
    [climate, climatePreferenceStep, climatePreferenceDirection],
  )

  if (failed) {
    return (
      <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--weather">
        <p
          role="status"
          className="wtr-weather-tab__unavailable"
          {...staggerSectionProps(0, undefined, staggerClassName, staggerStyle)}
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

  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--weather">
      <article className="wtr-weather-tab" aria-label="Climate and weather">
        <header
          className="wtr-weather-tab__header"
          {...staggerSectionProps(0, undefined, staggerClassName, staggerStyle)}
        >
          {detail.tags.length ? (
            <ul className="wtr-weather-tab__tags" aria-label="Climate traits">
              {detail.tags.map((tag) => (
                <li key={tag.label}>
                  <span className={`wtr-weather-tab__tag wtr-weather-tab__tag--${tag.tone}`}>
                    <ClimateTagIcon tone={tag.tone} />
                    {tag.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="wtr-weather-tab__title-row">
            <h2 className="wtr-weather-tab__title">{detail.categoryLabel}</h2>
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

          <p className="wtr-weather-tab__description">{detail.description}</p>
        </header>

        <aside
          className="wtr-weather-tab__retiree-callout"
          {...staggerSectionProps(1, undefined, staggerClassName, staggerStyle)}
        >
          <IconUsers size={18} stroke={1.5} aria-hidden />
          <p>{detail.retireeNote}</p>
        </aside>

        {climateNotes && climatePreferenceStep > 0 ? (
          <p
            className={[
              'wtr-weather-tab__preference-note',
              climateNotes.fitTone !== 'muted' && `wtr-weather-tab__preference-note--${climateNotes.fitTone}`,
            ]
              .filter(Boolean)
              .join(' ')}
            {...staggerSectionProps(2, undefined, staggerClassName, staggerStyle)}
          >
            {climateNotes.climateScore != null ? (
              <span className="wtr-weather-tab__preference-score tabular-nums">
                {climateNotes.climateScore}/100
              </span>
            ) : null}
            {climateNotes.climateNotes}
          </p>
        ) : null}

        <dl
          className="wtr-weather-tab__metrics"
          {...staggerSectionProps(
            climatePreferenceStep > 0 ? 3 : 2,
            undefined,
            staggerClassName,
            staggerStyle,
          )}
        >
          <div className="wtr-weather-tab__metric">
            <dt>Avg high</dt>
            <dd>
              <span className="wtr-weather-tab__metric-primary tabular-nums">{avgHigh.primary}</span>
              <span className="wtr-weather-tab__metric-secondary tabular-nums">{avgHigh.secondary}</span>
            </dd>
          </div>
          <div className="wtr-weather-tab__metric">
            <dt>Avg humidity</dt>
            <dd>
              {detail.metrics.avgHumidityPct != null ? (
                <>
                  <span
                    className={[
                      'wtr-weather-tab__metric-primary',
                      'tabular-nums',
                      detail.metrics.humidityLabel === 'Oppressive' && 'wtr-weather-tab__metric-primary--warning',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {detail.metrics.avgHumidityPct}%
                  </span>
                  {detail.metrics.humidityLabel ? (
                    <span
                      className={[
                        'wtr-weather-tab__metric-secondary',
                        detail.metrics.humidityLabel === 'Oppressive' && 'wtr-weather-tab__metric-secondary--warning',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {detail.metrics.humidityLabel}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="wtr-weather-tab__metric-primary">—</span>
              )}
            </dd>
          </div>
          <div className="wtr-weather-tab__metric">
            <dt>Rainy months</dt>
            <dd>
              <span className="wtr-weather-tab__metric-primary tabular-nums">
                {detail.metrics.rainyMonthCount}
              </span>
              {detail.metrics.rainyMonthRange ? (
                <span className="wtr-weather-tab__metric-secondary tabular-nums">
                  {detail.metrics.rainyMonthRange}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>

        <section
          className="wtr-weather-tab__seasons"
          aria-labelledby="wtr-weather-seasons-heading"
          {...staggerSectionProps(
            climatePreferenceStep > 0 ? 4 : 3,
            undefined,
            staggerClassName,
            staggerStyle,
          )}
        >
          <h3 id="wtr-weather-seasons-heading" className="wtr-weather-tab__section-label">
            Seasonal breakdown
          </h3>
          <div className="wtr-weather-tab__season-grid">
            {detail.seasons.map((season) => (
              <article key={season.season} className="wtr-weather-tab__season-card">
                <h4 className="wtr-weather-tab__season-name">{season.seasonLabel}</h4>
                <p className="wtr-weather-tab__season-temp tabular-nums">
                  {formatTempRange(season.tempLowC, season.tempHighC, tempUnit)}
                </p>
                <p className="wtr-weather-tab__season-desc">{season.description}</p>
                <span className={`wtr-weather-tab__season-tag wtr-weather-tab__season-tag--${season.tagTone}`}>
                  {season.tagLabel}
                </span>
              </article>
            ))}
          </div>
        </section>

        {detail.considerations.length ? (
          <section
            className="wtr-weather-tab__considerations"
            aria-labelledby="wtr-weather-considerations-heading"
            {...staggerSectionProps(
              climatePreferenceStep > 0 ? 5 : 4,
              undefined,
              staggerClassName,
              staggerStyle,
            )}
          >
            <h3 id="wtr-weather-considerations-heading" className="wtr-weather-tab__section-label">
              Climate considerations
            </h3>
            <ul className="wtr-weather-tab__consideration-list">
              {detail.considerations.map((item) => (
                <li
                  key={item.id}
                  className={[
                    'wtr-weather-tab__consideration',
                    !item.emphasized && 'wtr-weather-tab__consideration--muted',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span
                    className={`wtr-weather-tab__consideration-icon wtr-weather-tab__consideration-icon--${item.tone}`}
                    aria-hidden
                  >
                    <ConsiderationIcon tone={item.tone} />
                  </span>
                  <div className="wtr-weather-tab__consideration-copy">
                    <p className="wtr-weather-tab__consideration-title">{item.title}</p>
                    <p className="wtr-weather-tab__consideration-desc">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section
          className="wtr-weather-tab__chart-section"
          aria-labelledby="wtr-weather-chart-heading"
          {...staggerSectionProps(
            climatePreferenceStep > 0 ? 6 : 5,
            undefined,
            staggerClassName,
            staggerStyle,
          )}
        >
          <h3 id="wtr-weather-chart-heading" className="wtr-weather-tab__section-label">
            Monthly temperatures
          </h3>
          <ClimateMonthlyChart monthly={climate.monthly} />
          <p className="wtr-weather-tab__chart-note">
            Monthly avg. highs {formatTemp(Math.max(...climate.monthly.map((m) => m.avgHighC)), tempUnit)} / lows{' '}
            {formatTemp(Math.min(...climate.monthly.map((m) => m.avgLowC)), tempUnit)} (1990–2020)
          </p>
        </section>

        <p
          className="wtr-weather-tab__source"
          {...staggerSectionProps(
            climatePreferenceStep > 0 ? 7 : 6,
            undefined,
            staggerClassName,
            staggerStyle,
          )}
        >
          <IconInfoCircle size={14} stroke={1.5} aria-hidden />
          Climate normals from Open-Meteo (1990–2020). Current weather may differ.
        </p>
      </article>
    </div>
  )
}
