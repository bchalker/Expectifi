import {
  useCallback,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import './DetailsAccordion.scss'

const INTERACTIVE_SUMMARY_SELECTOR =
  'button, a, input, select, textarea, label, [role="combobox"], [role="listbox"], [role="option"], .csv-import-review-acct__bucket'

export type DetailsAccordionProps = {
  summary: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className' | 'style'>

/** Expandable section with CSS grid height animation (open and close). */
export function DetailsAccordion({
  summary,
  children,
  className = '',
  style,
  ...rest
}: DetailsAccordionProps) {
  const [open, setOpen] = useState(false)

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const handleSummaryClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if ((e.target as Element).closest(INTERACTIVE_SUMMARY_SELECTOR)) return
      toggleOpen()
    },
    [toggleOpen],
  )

  const handleSummaryKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      toggleOpen()
    },
    [toggleOpen],
  )

  return (
    <div
      className={['details-accordion', open && 'details-accordion--open', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      {...rest}
    >
      <div
        className="details-accordion__summary"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={handleSummaryClick}
        onKeyDown={handleSummaryKeyDown}
      >
        {summary}
      </div>
      <div className="details-accordion__panel">
        <div className="details-accordion__panel-inner">{children}</div>
      </div>
    </div>
  )
}
