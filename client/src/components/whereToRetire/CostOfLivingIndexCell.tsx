import type { TeleportScoreCategory } from '../../lib/api/teleport'
import { AnchoredHoverCell } from './AnchoredHoverCell'
import { ScoreProgressBar } from './ScoreProgressBar'
import './CostOfLivingIndexCell.scss'
import './ScoreDetailPanel.scss'

type Props = {
  score: number | null
  source: 'Teleport' | 'Estimate'
  breakdown: TeleportScoreCategory[]
  destinationName: string
  estimatedLivingCostUsd: number
  estimatedLivingCostLabel: string
}

function fmtMon(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function ColDetailPanel({
  breakdown,
  source,
  destinationName,
  estimatedLivingCostUsd,
  estimatedLivingCostLabel,
}: Omit<Props, 'score'>) {
  return (
    <div className="wtr-score-panel">
      <p className="wtr-score-panel__title">Cost of living index</p>
      <p className="wtr-score-panel__meta">
        {destinationName} ·{' '}
        {source === 'Teleport' ? 'Teleport urban area scores' : 'Catalog estimate'}
      </p>
      <ul className="wtr-score-panel__list">
        {breakdown.map((item) => (
          <li key={item.name} className="wtr-score-panel__row">
            <span className="wtr-score-panel__label">{item.name}</span>
            <span className="wtr-score-panel__score">{item.score.toFixed(1)}</span>
          </li>
        ))}
      </ul>
      <div className="wtr-score-panel__stat">
        <span className="wtr-score-panel__stat-label">{estimatedLivingCostLabel}</span>
        <span className="wtr-score-panel__stat-value">{fmtMon(estimatedLivingCostUsd)}</span>
      </div>
      <p className="wtr-score-panel__note">
        Teleport scores cost of living 0–10 for the representative city (higher = more affordable
        relative to other cities). Adjust monthly living cost in the row above to model your budget.
      </p>
    </div>
  )
}

export function CostOfLivingIndexCell({
  score,
  source,
  breakdown,
  destinationName,
  estimatedLivingCostUsd,
  estimatedLivingCostLabel,
}: Props) {
  if (score == null) return <span className="wtr-grid__muted">—</span>

  const sourceLabel = source === 'Teleport' ? 'Teleport' : 'Estimate'

  return (
    <AnchoredHoverCell
      className="wtr-col-cell"
      bodyClassName="wtr-col-cell__body"
      panel={
        <ColDetailPanel
          breakdown={breakdown}
          source={source}
          destinationName={destinationName}
          estimatedLivingCostUsd={estimatedLivingCostUsd}
          estimatedLivingCostLabel={estimatedLivingCostLabel}
        />
      }
    >
      <ScoreProgressBar
        score={score}
        source={sourceLabel}
        label="Cost of living"
        className="wtr-col-cell__meter"
      />
    </AnchoredHoverCell>
  )
}
