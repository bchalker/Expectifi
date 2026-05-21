import { useMemo, type CSSProperties } from 'react'
import {
  getQualityOfLifeData,
  QOL_OVERALL_MAX,
  QOL_UNAVAILABLE_MESSAGE,
  qolBarColor,
  qolOverallBadgeLabel,
  qolOverallColor,
  type QualityOfLifeCountryData,
} from '../../utils/qualityOfLife'
import './DestinationQualityOfLifeTab.scss'

type Props = {
  country: string
  staggerClassName?: string
  staggerStyle?: (index: number) => CSSProperties
}

type MetricRowConfig = {
  label: string
  score: number
  inverted: boolean
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

function formatMetricScore(score: number): string {
  return Number.isInteger(score) ? `${score}` : score.toFixed(1)
}

function buildMetricRows(data: QualityOfLifeCountryData): MetricRowConfig[] {
  return [
    { label: 'Safety', score: data.safety_index, inverted: false },
    { label: 'Healthcare', score: data.healthcare_index, inverted: false },
    { label: 'Climate', score: data.climate_index, inverted: false },
    { label: 'Air quality', score: data.pollution_index, inverted: true },
    { label: 'Purchasing', score: data.purchasing_power_index, inverted: false },
    { label: 'Traffic', score: data.traffic_commute_index, inverted: true },
  ]
}

function QoLMetricRow({ label, score, inverted }: MetricRowConfig) {
  const fillPct = Math.min(100, Math.max(0, score))
  const color = qolBarColor(score, inverted)

  return (
    <div className="wtr-qol-tab__metric-row">
      <span className="wtr-qol-tab__metric-label">{label}</span>
      <div
        className="wtr-qol-tab__metric-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-label={`${label}: ${formatMetricScore(score)} out of 100`}
      >
        <div
          className="wtr-qol-tab__metric-fill"
          style={{ width: `${fillPct}%`, background: color }}
        />
      </div>
      <span className="wtr-qol-tab__metric-value tabular-nums">{formatMetricScore(score)}</span>
    </div>
  )
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

  const overallScore = data.quality_of_life_index
  const overallColor = qolOverallColor(overallScore)
  const overallFillPct = Math.min(100, (overallScore / QOL_OVERALL_MAX) * 100)
  const tierLabel = qolOverallBadgeLabel(overallScore)
  const metrics = buildMetricRows(data)

  return (
    <div className="wtr-qol-tab">
      <section
        className="wtr-qol-tab__overall"
        style={{ '--wtr-qol-accent': overallColor } as CSSProperties}
        {...staggerSectionProps(0, undefined, staggerClassName, staggerStyle)}
      >
        <div className="wtr-qol-tab__overall-head">
          <span className="wtr-qol-tab__overall-meta">Overall quality of life</span>
          <span className="wtr-qol-tab__overall-source">Numbeo 2024</span>
        </div>

        <div className="wtr-qol-tab__overall-score-row">
          <div className="wtr-qol-tab__overall-score-block tabular-nums">
            <span className="wtr-qol-tab__overall-score">{formatMetricScore(overallScore)}</span>
            <span className="wtr-qol-tab__overall-denom">/ {QOL_OVERALL_MAX}</span>
          </div>
          <span className="wtr-qol-tab__overall-tier">{tierLabel}</span>
        </div>

        <div
          className="wtr-qol-tab__overall-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={QOL_OVERALL_MAX}
          aria-valuenow={overallScore}
          aria-label={`Overall quality of life: ${formatMetricScore(overallScore)} out of ${QOL_OVERALL_MAX}`}
        >
          <div
            className="wtr-qol-tab__overall-fill"
            style={{ width: `${overallFillPct}%`, background: overallColor }}
          />
        </div>
      </section>

      <div
        className="wtr-qol-tab__metrics"
        {...staggerSectionProps(1, undefined, staggerClassName, staggerStyle)}
      >
        {metrics.map((row) => (
          <QoLMetricRow key={row.label} {...row} />
        ))}
      </div>

      <p
        className="wtr-qol-tab__footer"
        {...staggerSectionProps(2, undefined, staggerClassName, staggerStyle)}
      >
        Source: Numbeo Quality of Life Index 2024. Scores are crowdsourced estimates. Country-level
        data — city conditions may vary.
      </p>
    </div>
  )
}
