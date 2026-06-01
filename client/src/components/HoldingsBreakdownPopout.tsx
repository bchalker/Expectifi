import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useClickOutside } from '../hooks/useClickOutside'
import './HoldingsSymbolCard.scss'

const POPOUT_WIDTH = 272
const POPOUT_GAP = 6
const VIEWPORT_PAD = 8

function computePopoutStyle(rect: DOMRect): CSSProperties {
  const width = Math.min(POPOUT_WIDTH, window.innerWidth - VIEWPORT_PAD * 2)
  let left = rect.left
  left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - width - VIEWPORT_PAD))

  const estimatedHeight = 160
  const spaceBelow = window.innerHeight - rect.bottom - POPOUT_GAP
  if (spaceBelow >= estimatedHeight) {
    return { position: 'fixed', top: rect.bottom + POPOUT_GAP, left, width }
  }

  return {
    position: 'fixed',
    top: rect.top - POPOUT_GAP,
    left,
    width,
    transform: 'translateY(-100%)',
  }
}

type Props = {
  open: boolean
  anchorRef: RefObject<HTMLButtonElement | null>
  panelId: string
  onClose: () => void
  note: ReactNode
  children: ReactNode
}

export function HoldingsBreakdownPopout({
  open,
  anchorRef,
  panelId,
  onClose,
  note,
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties | null>(null)

  const syncPosition = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    setStyle(computePopoutStyle(anchor.getBoundingClientRect()))
  }, [anchorRef])

  useClickOutside(panelRef, onClose, open, [anchorRef])

  useEffect(() => {
    if (!open) {
      setStyle(null)
      return
    }
    syncPosition()
    window.addEventListener('scroll', syncPosition, true)
    window.addEventListener('resize', syncPosition)
    return () => {
      window.removeEventListener('scroll', syncPosition, true)
      window.removeEventListener('resize', syncPosition)
    }
  }, [open, syncPosition])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !style || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-modal="false"
      className="holdings-breakdown-popout holdings-breakdown-popout--open"
      style={style}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="holdings-breakdown-popout__dialog">
        {note}
        <div className="holdings-symbol-card__breakdown-inner">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
