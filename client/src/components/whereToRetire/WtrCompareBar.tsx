import { IconArrowRight, IconMapPin } from '@tabler/icons-react'
import { Tooltip } from '../Tooltip'
import './WtrCompareBar.scss'

export type CompareBarCity = {
  id: string
  name: string
}

type Props = {
  cities: CompareBarCity[]
  onViewComparison: () => void
  onClearAll: () => void
  className?: string
}

function cityCountLabel(count: number): string {
  return count === 1 ? '1 city' : `${count} cities`
}

function compareCtaLabel(count: number): string {
  return count === 1
    ? 'View 1 Comparison'
    : `View ${count} Comparisons`
}

function CompareCityList({ cities }: { cities: CompareBarCity[] }) {
  if (cities.length === 0) {
    return <p className="wtr-compare-bar__tooltip-empty">No cities selected</p>
  }

  return (
    <ul className="wtr-compare-bar__tooltip-list">
      {cities.map((city) => (
        <li key={city.id} className="wtr-compare-bar__tooltip-item">
          {city.name}
        </li>
      ))}
    </ul>
  )
}

export function WtrCompareBar({ cities, onViewComparison, onClearAll, className }: Props) {
  const count = cities.length
  if (count <= 0) return null

  return (
    <div
      className={['wtr-compare-bar', className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <Tooltip
        content={<CompareCityList cities={cities} />}
        placement="bottom"
        contentClassName="wtr-compare-bar__tooltip-content"
      >
        <span className="wtr-compare-bar__count">
          <IconMapPin size={16} stroke={1.5} aria-hidden />
          <span className="wtr-compare-bar__count-label">{cityCountLabel(count)}</span>
        </span>
      </Tooltip>

      <button
        type="button"
        className="wtr-compare-bar__clear-btn"
        onClick={onClearAll}
        aria-label="Clear all cities from comparison"
      >
        Clear
      </button>

      <button
        type="button"
        className="wtr-compare-bar__compare-btn"
        onClick={onViewComparison}
        aria-label={compareCtaLabel(count)}
      >
        <span>{compareCtaLabel(count)}</span>
        <IconArrowRight size={16} stroke={1.5} aria-hidden />
      </button>
    </div>
  )
}
