import { useUserLocale } from '../../../context/UserLocaleContext'
import { Tooltip } from '../../Tooltip'
import {
  formatQoLIndex,
  getQualityOfLifeData,
  isQoLUsBaselineComparable,
  qolNormalizedFromIndex,
  qolOverallScoreBand,
  getUsQoLNormalizedBenchmark,
  QOL_NORMALIZED_MAX,
  type QoLOverallBand,
} from '../../../utils/qualityOfLife'
import {
  colComparisonParts,
  colIndexBand,
  getColIndexForCountry,
  getHomeColBenchmark,
  INDEX_UNAVAILABLE_DISPLAY,
  indexBarScaleMax,
  qolComparisonParts,
  qolIndexBandRelative,
  type ColIndexBand,
  type IndexComparisonParts,
  type QolIndexBand,
} from './cityDetailTabUtils'
import './CityDetailIndexRows.scss'
import '../../Tooltip.scss'

const COL_INDEX_TOOLTIP =
  'Numbeo cost of living index (New York City = 100). Lower scores mean lower everyday costs. Country-level data — city costs may vary.'

const QOL_INDEX_TOOLTIP =
  'Overall quality of life score normalized to 0–100. Numbeo-sourced destinations include a US average marker on the same scale. Country-level data — city conditions may vary.'

const QOL_US_BASELINE_TOOLTIP =
  'US overall quality of life normalized to 0–100 from Numbeo country data (same source and formula as Numbeo-sourced destinations). Country-level data — city conditions may vary.'

const HOME_AVG_TOOLTIPS = {
  col: COL_INDEX_TOOLTIP,
  qol: QOL_INDEX_TOOLTIP,
} as const

type IndexCardProps = {
  label: string
  tooltip: string
  benchmarkTooltip?: string
  value: number | null
  displayValue: string
  band: ColIndexBand | QoLOverallBand | null
  comparisonBand: ColIndexBand | QolIndexBand | null
  benchmark: number | null
  comparison: IndexComparisonParts | null
  tierLabel: string | null
  titleSuffix: string | null
  fillVariant: 'col' | 'qol'
}

const INDEX_BAR_GOOD_BANDS = new Set<string>(['affordable', 'excellent', 'above-average'])
const INDEX_BAR_MID_BANDS = new Set<string>(['moderate', 'average'])

type IndexBarTone = 'good' | 'mid' | 'bad' | 'neutral'

function indexBarFillTone(
  band: ColIndexBand | QoLOverallBand | QolIndexBand | null,
): IndexBarTone {
  if (!band) return 'neutral'
  if (INDEX_BAR_GOOD_BANDS.has(band)) return 'good'
  if (INDEX_BAR_MID_BANDS.has(band)) return 'mid'
  return 'bad'
}

function IndexCaptionPill({
  label,
  tone,
}: {
  label: string
  tone: IndexBarTone
}) {
  return (
    <span
      className={[
        'wtr-city-detail-index-card__pill',
        tone !== 'neutral' && `wtr-city-detail-index-card__pill--${tone}`,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  )
}

function IndexComparisonRow({
  comparison,
  tone,
  tooltip,
}: {
  comparison: IndexComparisonParts
  tone: IndexBarTone
  tooltip: string
}) {
  return (
    <div className="wtr-city-detail-index-card__comparison-row">
      <IndexCaptionPill label={comparison.pillLabel} tone={tone} />
      <span className="wtr-city-detail-index-card__comparison-text">
        {comparison.suffixBeforeBenchmark}
        <Tooltip
          content={tooltip}
          placement="top"
          triggerClassName="wtr-city-detail-index-card__comparison-tip"
        >
          <span className="wtr-city-detail-index-card__comparison-ref">
            {comparison.benchmarkPhrase}
          </span>
        </Tooltip>
      </span>
    </div>
  )
}

function IndexTierRow({ label, tone }: { label: string; tone: IndexBarTone }) {
  return (
    <div className="wtr-city-detail-index-card__tier-row">
      <IndexCaptionPill label={label} tone={tone} />
    </div>
  )
}

function CityDetailIndexCard({
  label,
  tooltip,
  benchmarkTooltip,
  value,
  displayValue,
  band,
  comparisonBand,
  benchmark,
  comparison,
  tierLabel,
  titleSuffix,
  fillVariant,
}: IndexCardProps) {
  const showBar = value != null && Number.isFinite(value)
  const usesHomeBenchmark = benchmark != null && Number.isFinite(benchmark)
  const scaleMax = showBar
    ? usesHomeBenchmark
      ? indexBarScaleMax(value, benchmark)
      : QOL_NORMALIZED_MAX
    : QOL_NORMALIZED_MAX
  const fillPct = showBar ? Math.min(100, (value / scaleMax) * 100) : 0
  const markerPct =
    showBar && usesHomeBenchmark ? Math.min(100, (benchmark / scaleMax) * 100) : null
  const accentBand = comparison ? comparisonBand : band
  const fillTone = indexBarFillTone(accentBand)

  return (
    <article
      className={[
        'wtr-city-detail-index-card',
        band ? `wtr-city-detail-index-card--${band}` : 'wtr-city-detail-index-card--unavailable',
        `wtr-city-detail-index-card--${fillVariant}`,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <h4 className="wtr-city-detail-index-card__title">
        {label}
        {titleSuffix ? (
          <span className="wtr-city-detail-index-card__title-suffix">{titleSuffix}</span>
        ) : null}
      </h4>

      <div className="wtr-city-detail-index-card__score-wrap">
        <p
          className={[
            'wtr-city-detail-index-card__score',
            'tabular-nums',
            `wtr-city-detail-index-card__score--${fillTone}`,
          ].join(' ')}
        >
          {displayValue}
        </p>
      </div>

      {showBar ? (
        <div className="wtr-city-detail-index-card__bar-wrap">
          <div
            className={[
              'wtr-city-detail-index-card__track',
              `wtr-city-detail-index-card__track--${fillTone}`,
            ].join(' ')}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={scaleMax}
            aria-valuenow={value}
            aria-label={`${label}: ${displayValue}`}
          >
            <div
              className={[
                'wtr-city-detail-index-card__fill',
                `wtr-city-detail-index-card__fill--${fillTone}`,
              ].join(' ')}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          {markerPct != null ? (
            <div
              className="wtr-city-detail-index-card__marker"
              style={{ left: `${markerPct}%` }}
              aria-hidden
            >
              <span className="wtr-city-detail-index-card__marker-tick" />
            </div>
          ) : null}
        </div>
      ) : null}

      {comparison ? (
        <div className="wtr-city-detail-index-card__caption">
          <IndexComparisonRow
            comparison={comparison}
            tone={fillTone}
            tooltip={benchmarkTooltip ?? tooltip}
          />
        </div>
      ) : tierLabel && band ? (
        <div className="wtr-city-detail-index-card__caption">
          <IndexTierRow label={tierLabel} tone={fillTone} />
        </div>
      ) : null}
    </article>
  )
}

function colIndexMetrics(country: string): { value: number | null; display: string } {
  const colIndex = getColIndexForCountry(country)
  if (colIndex == null) {
    return { value: null, display: INDEX_UNAVAILABLE_DISPLAY }
  }
  return { value: colIndex, display: formatQoLIndex(colIndex) }
}

function qolIndexMetrics(country: string): { value: number | null; display: string } {
  const qol = getQualityOfLifeData(country)
  if (!qol) return { value: null, display: INDEX_UNAVAILABLE_DISPLAY }
  const normalized = qolNormalizedFromIndex(qol.quality_of_life_index)
  return { value: normalized, display: formatQoLIndex(normalized) }
}

type Props = {
  country: string
  className?: string
}

export function CityDetailIndexRows({ country, className }: Props) {
  const { locale } = useUserLocale()
  const colIndex = colIndexMetrics(country)
  const qolData = getQualityOfLifeData(country)
  const qolIndex = qolIndexMetrics(country)
  const homeColBenchmark = getHomeColBenchmark(locale)
  const qolTier = qolData ? qolOverallScoreBand(qolData.quality_of_life_index) : null
  const qolUsComparable = isQoLUsBaselineComparable(qolData?.source)
  const usQolBenchmark = qolUsComparable ? getUsQoLNormalizedBenchmark() : null
  const qolComparison =
    qolUsComparable && qolIndex.value != null && usQolBenchmark != null
      ? qolComparisonParts(qolIndex.value, usQolBenchmark)
      : null
  const qolComparisonBand =
    qolUsComparable && qolIndex.value != null && usQolBenchmark != null
      ? qolIndexBandRelative(qolIndex.value, usQolBenchmark)
      : null

  const colBand =
    colIndex.value != null && homeColBenchmark != null
      ? colIndexBand(colIndex.value, homeColBenchmark)
      : null

  const colComparison =
    colIndex.value != null && homeColBenchmark != null
      ? colComparisonParts(colIndex.value, homeColBenchmark, locale)
      : null

  return (
    <div className={['wtr-city-detail__index-rows', className].filter(Boolean).join(' ')}>
      <CityDetailIndexCard
        label="Cost of Living"
        tooltip={HOME_AVG_TOOLTIPS.col}
        value={colIndex.value}
        displayValue={colIndex.display}
        band={colBand}
        comparisonBand={colBand}
        benchmark={homeColBenchmark}
        comparison={colComparison}
        tierLabel={null}
        titleSuffix={null}
        fillVariant="col"
      />
      <CityDetailIndexCard
        label="Quality of Life"
        tooltip={HOME_AVG_TOOLTIPS.qol}
        benchmarkTooltip={QOL_US_BASELINE_TOOLTIP}
        value={qolIndex.value}
        displayValue={qolIndex.display}
        band={qolTier?.band ?? null}
        comparisonBand={qolComparisonBand}
        benchmark={qolUsComparable ? usQolBenchmark : null}
        comparison={qolComparison}
        tierLabel={qolUsComparable ? null : (qolTier?.label ?? null)}
        titleSuffix="(Country avg)"
        fillVariant="qol"
      />
    </div>
  )
}
