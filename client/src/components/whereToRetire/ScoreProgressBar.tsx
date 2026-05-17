type Props = {
  score: number | null
  source: string
  label: string
  className?: string
}

export function ScoreProgressBar({ score, source, label, className }: Props) {
  if (score == null) return <span className="wtr-grid__muted">—</span>

  const clamped = Math.min(10, Math.max(0, score))
  const fillPct = (clamped / 10) * 100

  const rootClass = ['wtr-grid__score-meter', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      <div className="wtr-grid__score-meter-head">
        <span className="wtr-grid__score-val">{clamped.toFixed(1)}</span>
        <span className="wtr-grid__score-denom">/ 10</span>
      </div>
      <div
        className="wtr-grid__score-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={clamped}
        aria-label={`${label}: ${clamped.toFixed(1)} out of 10`}
      >
        <div className="wtr-grid__score-fill" style={{ width: `${fillPct}%` }} />
      </div>
      <span className="wtr-grid__score-sub">{source}</span>
    </div>
  )
}
