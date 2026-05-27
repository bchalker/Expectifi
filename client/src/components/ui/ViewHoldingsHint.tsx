import { IconChevronDown } from '@tabler/icons-react'
import './ViewHoldingsHint.scss'

type Props = {
  className?: string
}

/** Expand/collapse chevron beside bucket total; color follows parent `<details>`. */
export function ViewHoldingsHint({ className = '' }: Props) {
  return (
    <span
      className={`view-holdings-hint${className ? ` ${className}` : ''}`}
      aria-label="View holdings"
    >
      <IconChevronDown className="view-holdings-hint__icon" size={16} stroke={1.5} aria-hidden />
    </span>
  )
}
