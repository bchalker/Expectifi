import { useMemo, type CSSProperties, type ReactNode } from 'react'
import {
  IconArrowDownDashed,
  IconCar,
  IconHeartRateMonitor,
  IconShieldCheck,
  IconSun,
  IconWallet,
  IconWind,
} from '@tabler/icons-react'
import {
  getQualityOfLifeData,
  interpretClimate,
  interpretHealthcare,
  interpretPollution,
  interpretPurchasingPower,
  interpretSafety,
  interpretTraffic,
  QOL_OVERALL_MAX,
  QOL_TAB_SOURCE_FOOTER,
  QOL_UNAVAILABLE_MESSAGE,
  qolBarFillPercent,
  type QualityOfLifeCountryData,
} from '../../utils/qualityOfLife'
import './ColCategoryCard.scss'
import './DestinationQualityOfLifeTab.scss'

const QOL_ICON_SIZE = 18

type Props = {
  country: string
  staggerClassName?: string
  staggerStyle?: (index: number) => CSSProperties
}

type ScoreCardConfig = {
  id: string
  label: string
  score: number
  interpretation: string
  invertBar: boolean
  icon: ReactNode
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

function QoLProgressBar({
  fillPct,
  valueNow,
  max,
  label,
  prominent = false,
}: {
  fillPct: number
  valueNow: number
  max: number
  label: string
  prominent?: boolean
}) {
  return (
    <div
      className={[
        'wtr-qol-card__bar-track',
        prominent ? 'wtr-qol-card__bar-track--prominent' : null,
      ]
        .filter(Boolean)
        .join(' ')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={valueNow}
      aria-label={label}
    >
      <div className="wtr-qol-card__bar-fill" style={{ width: `${fillPct}%` }} />
    </div>
  )
}

function QoLCategoryCardHead({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <header className="wtr-col-category-card__head">
      <div className="wtr-col-category-card__head-row">
        <span className="wtr-col-category-card__icon" aria-hidden>
          {icon}
        </span>
        <h4 className="wtr-col-category-card__title">{title}</h4>
      </div>
      <span className="wtr-col-category-card__head-arrow" aria-hidden>
        <IconArrowDownDashed size={20} stroke={2} />
      </span>
    </header>
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
  const overallFill = Math.min(100, (data.quality_of_life_index / QOL_OVERALL_MAX) * 100)
  const scoreValue = formatScore(data.quality_of_life_index)
  const scoreLabel = `${scoreValue} / ${QOL_OVERALL_MAX}`

  return (
    <article
      className={['wtr-col-category-card', 'wtr-qol-overall-card', className].filter(Boolean).join(' ')}
      style={style}
      aria-labelledby="wtr-qol-overall-heading"
    >
      <QoLCategoryCardHead
        title="Overall quality of life score"
        icon={<IconSun size={QOL_ICON_SIZE} stroke={1.5} />}
      />
      <div className="wtr-qol-overall-card__body">
        <p id="wtr-qol-overall-heading" className="wtr-qol-overall-card__score tabular-nums">
          <span className="wtr-qol-overall-card__score-value">{scoreValue}</span>
          <span className="wtr-qol-overall-card__score-denom"> / {QOL_OVERALL_MAX}</span>
        </p>
        <QoLProgressBar
          fillPct={overallFill}
          valueNow={data.quality_of_life_index}
          max={QOL_OVERALL_MAX}
          label={`Overall quality of life: ${scoreLabel}`}
          prominent
        />
        <p className="wtr-qol-overall-card__source">Numbeo 2024</p>
      </div>
    </article>
  )
}

function QoLMetricCard({
  config,
  className,
  style,
}: {
  config: ScoreCardConfig
  className?: string
  style?: CSSProperties
}) {
  const fillPct = qolBarFillPercent(config.score, config.invertBar)
  const scoreLabel = formatScore(config.score)

  return (
    <article className={['wtr-col-category-card', className].filter(Boolean).join(' ')} style={style}>
      <QoLCategoryCardHead title={config.label} icon={config.icon} />
      <div className="wtr-col-category-card__body wtr-col-category-card__body--no-footer">
        <div className="wtr-col-category-card__hero">
          <p className="wtr-col-category-card__hero-value">{scoreLabel}</p>
          <QoLProgressBar
            fillPct={fillPct}
            valueNow={config.score}
            max={100}
            label={`${config.label}: ${scoreLabel} out of 100`}
          />
          <p className="wtr-col-category-card__hero-label">{config.interpretation}</p>
        </div>
      </div>
    </article>
  )
}

function buildScoreCards(data: QualityOfLifeCountryData): ScoreCardConfig[] {
  return [
    {
      id: 'safety',
      label: 'Safety',
      score: data.safety_index,
      interpretation: interpretSafety(data.safety_index),
      invertBar: false,
      icon: <IconShieldCheck size={QOL_ICON_SIZE} stroke={1.5} />,
    },
    {
      id: 'healthcare',
      label: 'Healthcare quality',
      score: data.healthcare_index,
      interpretation: interpretHealthcare(data.healthcare_index),
      invertBar: false,
      icon: <IconHeartRateMonitor size={QOL_ICON_SIZE} stroke={1.5} />,
    },
    {
      id: 'climate',
      label: 'Climate',
      score: data.climate_index,
      interpretation: interpretClimate(data.climate_index),
      invertBar: false,
      icon: <IconSun size={QOL_ICON_SIZE} stroke={1.5} />,
    },
    {
      id: 'pollution',
      label: 'Air & environment',
      score: data.pollution_index,
      interpretation: interpretPollution(data.pollution_index),
      invertBar: true,
      icon: <IconWind size={QOL_ICON_SIZE} stroke={1.5} />,
    },
    {
      id: 'purchasing',
      label: 'Purchasing power',
      score: data.purchasing_power_index,
      interpretation: interpretPurchasingPower(data.purchasing_power_index),
      invertBar: false,
      icon: <IconWallet size={QOL_ICON_SIZE} stroke={1.5} />,
    },
    {
      id: 'traffic',
      label: 'Traffic & commute',
      score: data.traffic_commute_index,
      interpretation: interpretTraffic(data.traffic_commute_index),
      invertBar: true,
      icon: <IconCar size={QOL_ICON_SIZE} stroke={1.5} />,
    },
  ]
}

export function DestinationQualityOfLifeTab({ country, staggerClassName, staggerStyle }: Props) {
  const data = useMemo(() => getQualityOfLifeData(country), [country])

  if (!data) {
    return (
      <p
        className="wtr-qol-tab__empty"
        {...staggerSectionProps(0, 'wtr-qol-tab__empty', staggerClassName, staggerStyle)}
      >
        {QOL_UNAVAILABLE_MESSAGE}
      </p>
    )
  }

  const cards = buildScoreCards(data)

  return (
    <div className="wtr-dest-panel__col-stack wtr-qol-tab">
      <div className="wtr-dest-panel__cards wtr-dest-panel__cards--qol-overall">
        <QoLOverallCard
          data={data}
          {...staggerSectionProps(0, undefined, staggerClassName, staggerStyle)}
        />
      </div>

      <div className="wtr-dest-panel__cards">
        {cards.map((card, index) => (
          <QoLMetricCard
            key={card.id}
            config={card}
            {...staggerSectionProps(index + 1, undefined, staggerClassName, staggerStyle)}
          />
        ))}
      </div>

      <p
        className="wtr-dest-panel__data-source"
        {...staggerSectionProps(cards.length + 1, 'wtr-dest-panel__data-source', staggerClassName, staggerStyle)}
      >
        {QOL_TAB_SOURCE_FOOTER}
      </p>
    </div>
  )
}
