import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { formatHoldingDailyChangeLine, formatHoldingLastPerShare, formatHoldingShareCount } from '../lib/fidelityHoldingDisplay'
import './FidelityHoldingScenarioPopout.scss'

export type FidelityValueHoverSource = {
  quantity: number
  lastPrice: number
  dailyChangeDollar: number | null
  dailyChangePercent: number | null
}

type Props = {
  open: boolean
  rect: DOMRect | null
  placement: 'above' | 'below'
  source: FidelityValueHoverSource
  onMouseEnterPopout: () => void
  onMouseLeavePopout: () => void
}

export function FidelityValueHoverPortal({
  open,
  rect,
  placement,
  source,
  onMouseEnterPopout,
  onMouseLeavePopout,
}: Props) {
  if (!open || !rect || typeof document === 'undefined') return null
  const pad = 6
  const style: CSSProperties =
    placement === 'above'
      ? {
          position: 'fixed',
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 230)),
          bottom: window.innerHeight - rect.top + pad,
        }
      : {
          position: 'fixed',
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 230)),
          top: rect.bottom + pad,
        }
  const chg = formatHoldingDailyChangeLine(source.dailyChangeDollar, source.dailyChangePercent)
  return createPortal(
    <div
      className="holdings-value-popout"
      style={style}
      role="tooltip"
      onMouseEnter={onMouseEnterPopout}
      onMouseLeave={onMouseLeavePopout}
    >
      <div className="holdings-value-popout__line">
        <strong>{formatHoldingShareCount(source.quantity)}</strong>
      </div>
      <div className="holdings-value-popout__line">
        Last: <strong>{formatHoldingLastPerShare(source.lastPrice)}</strong>
      </div>
      {chg ? <div className="holdings-value-popout__line">{chg}</div> : null}
    </div>,
    document.body,
  )
}
