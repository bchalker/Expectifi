import { useMemo, type CSSProperties } from 'react'
import {
  getQualityOfLifeData,
  QOL_NORMALIZED_MAX,
  QOL_TAB_SOURCE_FOOTER,
  QOL_UNAVAILABLE_MESSAGE,
  QOL_WORLD_BANK_PROXY_NOTE,
  qolBarFillPercent,
  qolMetricBarBand,
  qolNormalizedFromIndex,
  qolOverallScoreBand,
  type QoLMetricKey,
  type QualityOfLifeCountryData,
} from '../../utils/qualityOfLife'
import './DestinationQualityOfLifeTab.scss'

type Props = {
  country: string
  staggerClassName?: string
  staggerStyle?: (index: number) => CSSProperties
}

type MetricRowConfig = {
  id: QoLMetricKey
  label: string
  score: number
  invertBar: boolean
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

function formatScore(score: number): string {
  return Number.isInteger(score) ? `${score}` : score.toFixed(1)
}

function QoLBar({
  fillPct,
  valueNow,
  max,
  label,
  tone,
}: {
  fillPct: number
  valueNow: number
  max: number
  label: string
  tone: string
}) {
  return (
    <div
      className="wtr-qol-bar__track"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={valueNow}
      aria-label={label}
    >
      {fillPct > 0 ? (
        <div className={['wtr-qol-bar__fill', `wtr-qol-bar__fill--${tone}`].join(' ')} style={{ width: `${fillPct}%` }} />
      ) : null}
    </div>
  )
}

function QoLOverallCard({
  data,
  className,
  style,
}: {
  data: QualityOfLifeCountryData
  className?: string
  style?: CSSProperties
}) {
  const qolNormalized = qolNormalizedFromIndex(data.quality_of_life_index)
  const { band, label: bandLabel } = qolOverallScoreBand(data.quality_of_life_index)
  const overallFill = qolNormalized
  const scoreValue = formatScore(qolNormalized)

  return (
    <article
      className={['wtr-qol-overall', `wtr-qol-overall--${band}`, className].filter(Boolean).join(' ')}
      style={style}
      aria-labelledby="wtr-qol-overall-heading"
    >
      <h3
        id="wtr-qol-overall-heading"
        className="wtr-city-detail__section-title wtr-qol-overall__label"
      >
        Overall quality of life score
      </h3>
      <div className="wtr-qol-overall__score-row">
        <p className="wtr-qol-overall__score tabular-nums">
          <span className="wtr-qol-overall__score-value">{scoreValue}</span>
          <span className="wtr-qol-overall__score-denom"> / {QOL_NORMALIZED_MAX}</span>
        </p>
        <span className={`wtr-qol-overall__badge wtr-qol-overall__badge--${band}`}>{bandLabel}</span>
      </div>
      <QoLBar
        fillPct={overallFill}
        valueNow={qolNormalized}
        max={QOL_NORMALIZED_MAX}
        label={`Overall quality of life: ${scoreValue} out of ${QOL_NORMALIZED_MAX}`}
        tone={band}
      />
      {data.source === 'world_bank_proxy' ? (
        <p className="wtr-qol-overall__proxy-note">{QOL_WORLD_BANK_PROXY_NOTE}</p>
      ) : null}
    </article>
  )
}

function QoLMetricRow({ config }: { config: MetricRowConfig }) {
  const fillPct = qolBarFillPercent(config.score, config.invertBar)
  const tone = qolMetricBarBand(config.score, config.id)

  return (
    <li className="wtr-qol-metric-row">
      <span className="wtr-qol-metric-row__label">{config.label}</span>
      <QoLBar
        fillPct={fillPct}
        valueNow={config.score}
        max={100}
        label={`${config.label}: ${formatScore(config.score)} out of 100`}
        tone={tone}
      />
      <span className="wtr-qol-metric-row__value tabular-nums">{formatScore(config.score)}</span>
    </li>
  )
}

function buildMetricRows(data: QualityOfLifeCountryData): MetricRowConfig[] {
  return [
    { id: 'safety', label: 'Safety', score: data.safety_index, invertBar: false },
    { id: 'healthcare', label: 'Healthcare', score: data.healthcare_index, invertBar: false },
    { id: 'climate', label: 'Climate', score: data.climate_index, invertBar: false },
    { id: 'pollution', label: 'Air quality', score: data.pollution_index, invertBar: true },
    { id: 'purchasing', label: 'Purchasing', score: data.purchasing_power_index, invertBar: false },
    { id: 'traffic', label: 'Traffic', score: data.traffic_commute_index, invertBar: true },
  ]
}

export function DestinationQualityOfLifeTab({ country, staggerClassName, staggerStyle }: Props) {
  const data = useMemo(() => getQualityOfLifeData(country), [country])

  if (!data) {
    return (
      <p {...staggerSectionProps(0, 'wtr-qol-tab__empty', staggerClassName, staggerStyle)}>
        {QOL_UNAVAILABLE_MESSAGE}
      </p>
    )
  }

  const metrics = buildMetricRows(data)

  return (
    <div className="wtr-qol-tab">
      <section
        className="wtr-qol-tab__row wtr-qol-tab__row--overall"
        {...staggerSectionProps(0, undefined, staggerClassName, staggerStyle)}
      >
        <QoLOverallCard data={data} />
      </section>

      <section
        className="wtr-qol-tab__row wtr-qol-tab__row--breakdown"
        {...staggerSectionProps(1, undefined, staggerClassName, staggerStyle)}
      >
        <ul className="wtr-qol-metrics">
          {metrics.map((row) => (
            <QoLMetricRow key={row.id} config={row} />
          ))}
        </ul>
      </section>

      <section
        className="wtr-qol-tab__row wtr-qol-tab__row--source"
        {...staggerSectionProps(2, undefined, staggerClassName, staggerStyle)}
      >
        <p className="wtr-qol-tab__footnote">{QOL_TAB_SOURCE_FOOTER}</p>
      </section>
    </div>
  )
}
