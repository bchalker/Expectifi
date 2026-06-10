import {
  formatQoLIndex,
  getQualityOfLifeData,
  qolNormalizedFromIndex,
} from '../../../utils/qualityOfLife'
import {
  getColIndexForCountry,
  INDEX_UNAVAILABLE_DISPLAY,
} from './cityDetailTabUtils'

type IndexBarProps = {
  label: string
  value: number | null
  displayValue: string
}

function CityDetailIndexBar({ label, value, displayValue }: IndexBarProps) {
  const showBar = value != null && Number.isFinite(value)
  const fillPct = showBar ? Math.min(100, Math.max(0, value)) : 0

  return (
    <div className="wtr-city-detail__index-block">
      <div className="wtr-city-detail__index-head">
        <span className="wtr-city-detail__index-label">{label}</span>
        <span className="wtr-city-detail__index-value tabular-nums">{displayValue}</span>
      </div>
      {showBar ? (
        <div
          className="wtr-city-detail__index-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fillPct}
          aria-label={`${label}: ${displayValue}`}
        >
          <div
            className="wtr-city-detail__index-fill"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      ) : null}
    </div>
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
  const colIndex = colIndexMetrics(country)
  const qolIndex = qolIndexMetrics(country)

  return (
    <div className={['wtr-city-detail__index-rows', className].filter(Boolean).join(' ')}>
      <CityDetailIndexBar
        label="Cost of living index"
        value={colIndex.value}
        displayValue={colIndex.display}
      />
      <CityDetailIndexBar
        label="Quality of life index"
        value={qolIndex.value}
        displayValue={qolIndex.display}
      />
    </div>
  )
}
