import { IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useClickOutside } from '../hooks/useClickOutside'
import { formatFidelityDescription } from '../lib/fidelityDisplay'
import type { PositionReturnModel } from '../lib/positionReturnModel'
import { PositionReturnSlidersForm } from './PositionReturnSliders'
import './PositionReturnPopover.scss'

export type PositionReturnPopoverProps = {
  open: boolean
  onClose: () => void
  /** Kept for callers; layout is fixed (bottom-right / fullscreen on small viewports). */
  anchorTop?: number
  position: PositionReturnModel
  onPositionChange: (next: PositionReturnModel) => void
  blendedRate: number
  retirementYear: number
  retirementAge: number
  horizon?: number
}

export function PositionReturnPopover({
  open,
  onClose,
  anchorTop: _anchorTopUnused = 0,
  position,
  onPositionChange,
  blendedRate,
  retirementYear,
  retirementAge,
  horizon,
}: PositionReturnPopoverProps) {
  const [entered, setEntered] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  const onCloseStable = useCallback(() => {
    onClose()
  }, [onClose])

  const clickOutsideOpts = useMemo(
    () => ({ ignoreClosest: '[data-position-return-popover-ignore-outside]' }),
    [],
  )

  useClickOutside(panelRef, onCloseStable, open, undefined, clickOutsideOpts)

  useEffect(() => {
    if (!open) {
      setEntered(false)
      return
    }
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseStable()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCloseStable])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <aside
      ref={panelRef}
      className={`position-return-popover${entered ? ' position-return-popover--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`position-return-popover-title-${position.id}`}
    >
        <header className="position-return-popover__header">
          <div className="position-return-popover__header-main">
            <div id={`position-return-popover-title-${position.id}`} className="position-return-popover__badge">
              {position.ticker || '—'}
            </div>
            <div className="position-return-popover__name">{formatFidelityDescription(position.label)}</div>
            <p className="position-return-popover__intro">
              Set your own growth expectations for this line: flat rate, year-by-year returns, or a Bear / Base / Bull
              scenario. Changes apply to the retirement model only—imported balances stay as they are in Configure.
            </p>
          </div>
          <button type="button" className="position-return-popover__close" onClick={onCloseStable} aria-label="Close">
            <IconX size={16} stroke={1.75} aria-hidden />
          </button>
        </header>
        <div className="position-return-popover__form-wrap">
          <PositionReturnSlidersForm
            position={position}
            onPositionChange={onPositionChange}
            blendedRate={blendedRate}
            retirementYear={retirementYear}
            retirementAge={retirementAge}
            horizon={horizon}
            variant="popover"
          />
        </div>
        <footer className="position-return-popover__footer">
          <button type="button" className="position-return-popover__done" onClick={onCloseStable}>
            Done
          </button>
        </footer>
      </aside>,
    document.body,
  )
}
