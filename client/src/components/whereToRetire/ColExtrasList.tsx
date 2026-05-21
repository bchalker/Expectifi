import type { CSSProperties, ReactNode } from 'react'
import './ColExtrasList.scss'

export type ColExtraLineItem = {
  id: string
  label: string
  value: string
  note?: string
  icon: ReactNode
}

type Props = {
  items: ColExtraLineItem[]
  className?: string
  style?: CSSProperties
}

export function ColExtrasList({ items, className, style }: Props) {
  return (
    <div className={['wtr-col-extras-list', className].filter(Boolean).join(' ')} style={style}>
      {items.map((item) => (
        <div key={item.id} className="wtr-col-extras-list__row">
          <span className="wtr-col-extras-list__icon" aria-hidden>
            {item.icon}
          </span>
          <div className="wtr-col-extras-list__copy">
            <span className="wtr-col-extras-list__label">{item.label}</span>
            {item.note ? <span className="wtr-col-extras-list__note">{item.note}</span> : null}
          </div>
          <span className="wtr-col-extras-list__value tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
