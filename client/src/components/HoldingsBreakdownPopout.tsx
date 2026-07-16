import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useClickOutside } from '../hooks/useClickOutside'
import './HoldingsSymbolCard.scss'

const POPOUT_GAP = 8
const VIEWPORT_PAD = 8

type PopoutPlacement = 'right' | 'left'

type PopoutPosition = {
  top: number
  left: number
  placement: PopoutPlacement
  /** Arrow center offset from the panel's top edge, so it points at the trigger. */
  arrowTop: number
}

type Props = {
  open: boolean
  anchorRef: RefObject<HTMLButtonElement | null>
  panelId: string
  onClose: () => void
  onMouseEnterPopout?: () => void
  onMouseLeavePopout?: () => void
  note: ReactNode
  children: ReactNode
}

export function HoldingsBreakdownPopout({
  open,
  anchorRef,
  panelId,
  onClose,
  onMouseEnterPopout,
  onMouseLeavePopout,
  note,
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<PopoutPosition | null>(null)

  const syncPosition = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor || !panel) return

    const a = anchor.getBoundingClientRect()
    const { width, height } = panel.getBoundingClientRect()

    // Prefer placing to the right of the trigger; flip left if it would overflow.
    let placement: PopoutPlacement = 'right'
    let left = a.right + POPOUT_GAP
    if (left + width + VIEWPORT_PAD > window.innerWidth) {
      const leftCandidate = a.left - POPOUT_GAP - width
      if (leftCandidate >= VIEWPORT_PAD) {
        placement = 'left'
        left = leftCandidate
      } else {
        left = Math.max(
          VIEWPORT_PAD,
          Math.min(left, window.innerWidth - width - VIEWPORT_PAD),
        )
      }
    }

    // Vertically center on the trigger, clamped to the viewport.
    const anchorCenterY = a.top + a.height / 2
    let top = anchorCenterY - height / 2
    top = Math.max(
      VIEWPORT_PAD,
      Math.min(top, window.innerHeight - height - VIEWPORT_PAD),
    )

    setPos({ top, left, placement, arrowTop: anchorCenterY - top })
  }, [anchorRef])

  useClickOutside(panelRef, onClose, open, [anchorRef])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
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

  if (!open || typeof document === 'undefined') return null

  const style: CSSProperties = pos
    ? { position: 'fixed', top: pos.top, left: pos.left }
    : { position: 'fixed', top: 0, left: 0, visibility: 'hidden' }

  return createPortal(
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-modal="false"
      className="holdings-breakdown-popout holdings-breakdown-popout--open"
      data-placement={pos?.placement ?? 'right'}
      style={style}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerEnter={onMouseEnterPopout}
      onPointerLeave={onMouseLeavePopout}
    >
      <span
        className="holdings-breakdown-popout__arrow"
        data-placement={pos?.placement ?? 'right'}
        style={pos ? { top: pos.arrowTop } : undefined}
        aria-hidden
      />
      <div className="holdings-breakdown-popout__dialog">
        {note}
        <div className="holdings-symbol-card__breakdown-inner">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
