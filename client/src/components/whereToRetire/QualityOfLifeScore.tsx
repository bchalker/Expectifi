import type { TeleportScoreCategory } from '../../lib/api/teleport'
import { AnchoredHoverCell } from './AnchoredHoverCell'
import { ScoreProgressBar } from './ScoreProgressBar'
import './QualityOfLifeScore.scss'
import './ScoreDetailPanel.scss'

type Props = {
  score: number | null
  source: 'Teleport' | 'Estimate'
  breakdown: TeleportScoreCategory[]
  destinationName: string
}

function QoLDetailPanel({
  breakdown,
  source,
  destinationName,
}: {
  breakdown: TeleportScoreCategory[]
  source: 'Teleport' | 'Estimate'
  destinationName: string
}) {
  const hasComponents = source === 'Teleport' && breakdown.length > 1

  return (
    <div className="wtr-score-panel">
      <p className="wtr-score-panel__title">Quality of life inputs</p>
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
      {hasComponents ? (
        <p className="wtr-score-panel__note">
          Each factor is scored 0–10 by Teleport. The headline quality-of-life score reflects this
          mix; cost of living is shown separately.
        </p>
      ) : (
        <p className="wtr-score-panel__note">
          Teleport component scores were unavailable. This is a single benchmark score for the
          representative city in our catalog.
        </p>
      )}
    </div>
  )
}

export function QualityOfLifeScore({ score, source, breakdown, destinationName }: Props) {
  if (score == null) return <span className="wtr-grid__muted">—</span>

  const sourceLabel = source === 'Teleport' ? 'Teleport' : 'Estimate'

  return (
    <AnchoredHoverCell
      className="wtr-qol-cell"
      bodyClassName="wtr-qol-cell__body"
      panel={
        <QoLDetailPanel breakdown={breakdown} source={source} destinationName={destinationName} />
      }
    >
      <ScoreProgressBar
        score={score}
        source={sourceLabel}
        label="Quality of life"
        className="wtr-qol-cell__meter"
      />
    </AnchoredHoverCell>
  )
}
