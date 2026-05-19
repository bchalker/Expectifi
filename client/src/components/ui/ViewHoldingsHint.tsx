import './ViewHoldingsHint.scss'

type Props = {
  className?: string
}

/** Expandable row affordance label only (no trailing icon). */
export function ViewHoldingsHint({ className = '' }: Props) {
  return <span className={`view-holdings-hint${className ? ` ${className}` : ''}`}>View Holdings</span>
}
