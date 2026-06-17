import './DataConfidenceNote.scss'

type SourcedProps = {
  variant: 'sourced'
  /** e.g. "Country-level" */
  scope: string
  /** Named dataset, e.g. "Numbeo Quality of Life Index 2024" */
  dataset: string
  className?: string
}

type HeuristicProps = {
  variant: 'heuristic'
  className?: string
}

export type DataConfidenceNoteProps = SourcedProps | HeuristicProps

/** Inline source or confidence label — matches page footer tone, not vague "Source: Estimated". */
export function DataConfidenceNote(props: DataConfidenceNoteProps) {
  const className = ['data-confidence-note', props.className].filter(Boolean).join(' ')
  const text =
    props.variant === 'sourced'
      ? `${props.scope} · ${props.dataset}`
      : 'Rough estimate, not tied to a specific dataset'

  return <p className={className}>{text}</p>
}
