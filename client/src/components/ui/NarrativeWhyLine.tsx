import type { ReactNode } from 'react'
import './NarrativeWhyLine.scss'

type Props = {
  children?: ReactNode
  className?: string
}

export function NarrativeWhyLine({ children, className }: Props) {
  if (children == null || children === '') return null

  return (
    <p className={['narrative-why-line', className].filter(Boolean).join(' ')}>
      <span className="narrative-why-line__label">Why it matters for you:</span> {children}
    </p>
  )
}
