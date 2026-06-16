import type { CSSProperties, ReactNode } from 'react'
import './PanelHeadsUpCallout.scss'

type Props = {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function PanelHeadsUpCallout({ children, className, style }: Props) {
  return (
    <aside
      className={['panel-heads-up', className].filter(Boolean).join(' ')}
      style={style}
      role="note"
    >
      <p className="panel-heads-up__text">
        <strong className="panel-heads-up__lead">Heads up:</strong> {children}
      </p>
    </aside>
  )
}
