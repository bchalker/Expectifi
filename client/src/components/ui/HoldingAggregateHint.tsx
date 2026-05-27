import { IconListSearch } from '@tabler/icons-react'
import './HoldingAggregateHint.scss'

type Props = {
  className?: string
  expanded?: boolean
}

/** List-search icon beside holding scenario when the symbol spans multiple accounts. */
export function HoldingAggregateHint({ className = '', expanded = false }: Props) {
  return (
    <span
      className={[
        'holding-aggregate-hint',
        expanded ? 'holding-aggregate-hint--expanded' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <IconListSearch className="holding-aggregate-hint__icon" size={16} stroke={1.15} />
    </span>
  )
}
