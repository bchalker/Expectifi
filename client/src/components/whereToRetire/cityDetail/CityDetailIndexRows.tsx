import { useUserLocale } from '../../../context/UserLocaleContext'
import { Tooltip } from '../../Tooltip'
import { AppChip } from '../../ui/AppChip'
import { wtrIndexBandChipColor } from '../../../lib/whereToRetire/wtrChipColors'
import {
  formatQoLIndex,
  getQualityOfLifeData,
  qolNormalizedFromIndex,
  qolOverallScoreBand,
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
  type ColIndexBand,
  type IndexComparisonParts,
} from './cityDetailTabUtils'
import './CityDetailIndexRows.scss'
import '../../Tooltip.scss'

const COL_INDEX_TOOLTIP =
  'Numbeo cost of living index (New York City = 100). Lower scores mean lower everyday costs. Country-level data — city costs may vary.'

const QOL_INDEX_TOOLTIP =
  'Overall quality of life score normalized to 0–100 from Numbeo country data. Country-level data — city conditions may vary.'

const HOME_AVG_TOOLTIPS = {
  col: COL_INDEX_TOOLTIP,
  qol: QOL_INDEX_TOOLTIP,
} as const

type IndexCardProps = {
  label: string
  tooltip: string
  value: number | null
  displayValue: string
  band: ColIndexBand | QoLOverallBand | null
  benchmark: number | null
  comparison: IndexComparisonParts | null
  tierLabel: string | null
  titleSuffix: string | null
  fillVariant: 'col' | 'qol'
}

function IndexComparisonRow({
  comparison,
  band,
  tooltip,
}: {
  comparison: IndexComparisonParts
  band: ColIndexBand | null
  tooltip: string
}) {
  return (
    <div className="wtr-city-detail-index-card__comparison-row">
      <AppChip
        color={band ? wtrIndexBandChipColor(band) : 'default'}
        variant="soft"
      >
        {comparison.pillLabel}
      </AppChip>
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

function IndexTierRow({ label, band }: { label: string; band: QoLOverallBand }) {
  return (
    <div className="wtr-city-detail-index-card__tier-row">
      <AppChip color={wtrIndexBandChipColor(band)} variant="soft">
        {label}
      </AppChip>
    </div>
  )
}

const INDEX_BAR_GOOD_BANDS = new Set<string>(['affordable', 'excellent', 'above-average'])
const INDEX_BAR_MID_BANDS = new Set<string>(['moderate', 'average'])

function indexBarFillTone(band: ColIndexBand | QoLOverallBand | null): 'good' | 'mid' | 'bad' | 'neutral' {
  if (!band) return 'neutral'
  if (INDEX_BAR_GOOD_BANDS.has(band)) return 'good'
  if (INDEX_BAR_MID_BANDS.has(band)) return 'mid'
  return 'bad'
}

function CityDetailIndexCard({
  label,
  tooltip,
  value,
  displayValue,
  band,
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
  const fillTone = indexBarFillTone(band)

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

      <p className="wtr-city-detail-index-card__score tabular-nums">{displayValue}</p>

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

      {tierLabel && band ? (
        <IndexTierRow label={tierLabel} band={band as QoLOverallBand} />
      ) : comparison ? (
        <IndexComparisonRow comparison={comparison} band={band as ColIndexBand | null} tooltip={tooltip} />
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
        benchmark={homeColBenchmark}
        comparison={colComparison}
        tierLabel={null}
        titleSuffix={null}
        fillVariant="col"
      />
      <CityDetailIndexCard
        label="Quality of Life"
        tooltip={HOME_AVG_TOOLTIPS.qol}
        value={qolIndex.value}
        displayValue={qolIndex.display}
        band={qolTier?.band ?? null}
        benchmark={null}
        comparison={null}
        tierLabel={qolTier?.label ?? null}
        titleSuffix="(Country avg)"
        fillVariant="qol"
      />
    </div>
  )
}
