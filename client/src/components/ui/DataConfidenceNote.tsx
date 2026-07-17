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

type MessageProps = {
  /** Custom confidence / estimate copy (same visual tone as heuristic). */
  variant: 'message'
  text: string
  className?: string
}

export type DataConfidenceNoteProps = SourcedProps | HeuristicProps | MessageProps

/** Inline source or confidence label — matches page footer tone, not vague "Source: Estimated". */
export function DataConfidenceNote(props: DataConfidenceNoteProps) {
  const className = ['data-confidence-note', props.className].filter(Boolean).join(' ')
  const text =
    props.variant === 'sourced'
      ? `${props.scope} · ${props.dataset}`
      : props.variant === 'message'
        ? props.text
        : 'Rough estimate, not tied to a specific dataset'

  return <p className={className}>{text}</p>
}
