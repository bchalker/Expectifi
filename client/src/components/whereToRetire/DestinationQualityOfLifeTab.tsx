import { useMemo, type CSSProperties } from 'react'
import { IconShieldHeart, IconStethoscope } from '@tabler/icons-react'
import { DetailPanelCard } from '../ui/DetailPanelCard'
import { formatHealthcareInsuranceMonthlyRange } from '../../utils/countryPreferenceData'
import {
  formatHealthcareSourceLabel,
  getQualityOfLifeData,
  HEALTHCARE_BAND_SEGMENTS,
  healthcareBand,
  healthcareBandDescription,
  QOL_NORMALIZED_MAX,
  QOL_TAB_SOURCE_FOOTER,
  QOL_UNAVAILABLE_MESSAGE,
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

function QoLHealthcareCard({
  country,
  data,
  style,
}: {
  country: string
  data: QualityOfLifeCountryData
  style?: CSSProperties
}) {
  const score = data.healthcare_index
  const scoreValue = formatScore(score)
  const { band, label: bandLabel } = healthcareBand(score)
  const description = healthcareBandDescription(score)
  const sourceLabel = formatHealthcareSourceLabel(data.source)
  const insuranceRange = formatHealthcareInsuranceMonthlyRange(country)

  return (
    <DetailPanelCard
      as="article"
      className="wtr-qol-healthcare"
      aria-labelledby="wtr-qol-healthcare-heading"
      style={style}
    >
      <div className="wtr-qol-healthcare__body">
        <div id="wtr-qol-healthcare-heading" className="wtr-qol-healthcare__header">
          <span className="wtr-qol-healthcare__header-icon" aria-hidden>
            <IconStethoscope size={16} strokeWidth={1.5} />
          </span>
          <span className="wtr-qol-healthcare__header-label">Healthcare quality</span>
        </div>

        <div className="wtr-qol-healthcare__score-row">
          <p className="wtr-qol-healthcare__score tabular-nums">
            <span className="wtr-qol-healthcare__score-value">{scoreValue}</span>
            <span className="wtr-qol-healthcare__score-denom"> / 100</span>
          </p>
          <span className={`wtr-qol-healthcare__badge wtr-qol-healthcare__badge--${band}`}>
            {bandLabel}
          </span>
        </div>

        <p className="wtr-qol-healthcare__description">
          <span className="wtr-qol-healthcare__why-label">Why it matters for you:</span> {description}
        </p>

        <div className="wtr-qol-healthcare__meter" role="img" aria-label={`Healthcare band: ${bandLabel}`}>
          <div className="wtr-qol-healthcare__meter-segments">
            {HEALTHCARE_BAND_SEGMENTS.map((segment) => (
              <div
                key={segment.band}
                className={[
                  'wtr-qol-healthcare__meter-segment',
                  `wtr-qol-healthcare__meter-segment--${segment.band}`,
                  segment.band === band ? 'wtr-qol-healthcare__meter-segment--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </div>
          <div className="wtr-qol-healthcare__meter-labels">
            {HEALTHCARE_BAND_SEGMENTS.map((segment) => (
              <span
                key={segment.band}
                className={[
                  'wtr-qol-healthcare__meter-label',
                  segment.band === band ? 'wtr-qol-healthcare__meter-label--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {segment.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="wtr-qol-healthcare__divider" role="presentation" />

      <div className="wtr-qol-healthcare__insurance">
        <div className="wtr-qol-healthcare__insurance-label">
          <span className="wtr-qol-healthcare__insurance-icon" aria-hidden>
            <IconShieldHeart size={16} strokeWidth={1.5} />
          </span>
          <span>Insurance cost</span>
        </div>
        <p className="wtr-qol-healthcare__insurance-value tabular-nums">
          {insuranceRange}
          <span className="wtr-qol-healthcare__insurance-suffix">/mo est.</span>
        </p>
      </div>

      <div className="wtr-qol-healthcare__divider" role="presentation" />

      <p className="wtr-qol-healthcare__footer">
        Rated by country, not city · Source: {sourceLabel}
      </p>
    </DetailPanelCard>
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
    <div
      className={['wtr-qol-overall', `wtr-qol-overall--${band}`, className].filter(Boolean).join(' ')}
      style={style}
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
    </div>
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
        className="wtr-qol-tab__row wtr-qol-tab__row--score"
        {...staggerSectionProps(0, undefined, staggerClassName, staggerStyle)}
      >
        <DetailPanelCard
          as="article"
          className="wtr-qol-score-card"
          aria-labelledby="wtr-qol-overall-heading"
        >
          <QoLOverallCard data={data} />
          <ul className="wtr-qol-metrics">
            {metrics.map((row) => (
              <QoLMetricRow key={row.id} config={row} />
            ))}
          </ul>
        </DetailPanelCard>
      </section>

      <section
        className="wtr-qol-tab__row wtr-qol-tab__row--healthcare"
        {...staggerSectionProps(1, undefined, staggerClassName, staggerStyle)}
      >
        <QoLHealthcareCard country={country} data={data} />
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
