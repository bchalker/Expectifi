import type { TeleportScoreCategory } from '../../lib/api/teleport'
import { ScoreProgressBar } from './ScoreProgressBar'
import './AnchoredHoverCell.scss'
import './CostOfLivingIndexCell.scss'

type Props = {
  score: number | null
  source: 'Teleport' | 'Estimate'
  breakdown: TeleportScoreCategory[]
  destinationName: string
  estimatedLivingCostUsd: number
  estimatedLivingCostLabel: string
  onOpen: () => void
}

export function CostOfLivingIndexCell({
  score,
  source,
  onOpen,
}: Props) {
  if (score == null) return <span className="wtr-grid__muted">—</span>

  const sourceLabel = source === 'Teleport' ? 'Teleport' : 'Estimate'

  return (
    <button
      type="button"
      className="wtr-hover-cell wtr-col-cell"
      onClick={onOpen}
      aria-label="View cost of living details"
    >
      <span className="wtr-hover-cell__corner" aria-hidden />
      <span className="wtr-hover-cell__body wtr-col-cell__body">
        <ScoreProgressBar
          score={score}
          source={sourceLabel}
          label="Cost of living"
          className="wtr-col-cell__meter"
        />
      </span>
    </button>
  )
}
