import { IconX } from '@tabler/icons-react'
import './WtrCompareBar.scss'

type Props = {
  count: number
  onViewComparison: () => void
  onClearAll: () => void
}

export function WtrCompareBar({ count, onViewComparison, onClearAll }: Props) {
  if (count <= 0) return null

  const label = count === 1 ? 'Compare 1 city' : `Compare ${count} cities`

  return (
    <div className="wtr-compare-bar" role="status" aria-live="polite">
      <p className="wtr-compare-bar__label">{label}</p>
      <button type="button" className="wtr-compare-bar__cta" onClick={onViewComparison}>
        View comparison
      </button>
      <button
        type="button"
        className="wtr-compare-bar__clear"
        onClick={onClearAll}
        aria-label="Clear all cities from comparison"
      >
        <IconX size={18} stroke={1.5} aria-hidden />
      </button>
    </div>
  )
}
