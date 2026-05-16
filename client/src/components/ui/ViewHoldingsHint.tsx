import { IconTrendingDown3 } from '@tabler/icons-react'
import './ViewHoldingsHint.scss'

type Props = {
  className?: string
}

/** Expandable row affordance: label + horizontally flipped trending-down icon. */
export function ViewHoldingsHint({ className = '' }: Props) {
  return (
    <span className={`view-holdings-hint${className ? ` ${className}` : ''}`}>
      View Holdings
      <IconTrendingDown3 className="view-holdings-hint__icon" size={14} stroke={1.5} aria-hidden />
    </span>
  )
}
