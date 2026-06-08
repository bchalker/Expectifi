import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { AppOverlayScrollbars } from './ui/AppOverlayScrollbars'
import { BottomSheetHandle } from './ui/BottomSheetHandle'
import { CloseButton } from '@heroui/react'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import { useIsMobileBottomSheet } from '../hooks/useMobileBottomSheet'
import './ui/BottomSheet.scss'
import './SidePanelShell.scss'

/** Must match mobile bottom-sheet close duration in PanelChrome.scss */
const PANEL_CLOSE_MS = 300

export type SidePanelShellProps = {
  open: boolean
  id?: string
  titleId: string
  title: ReactNode
  /** Shown under the title in the drawer header (e.g. config panel). */
  subtitle?: ReactNode
  'aria-labelledby'?: string
  onClose: () => void
  closeAriaLabel?: string
  children: ReactNode
  /** Fixed row between header and scroll body (e.g. config drawer tabs). */
  belowHeader?: ReactNode
  footer?: ReactNode
  /** Remounts scroll area when key changes (e.g. active drawer id). */
  scrollKey?: string | number
  /** Position + width modifiers, e.g. `drawer-shell--right` or `drawer-shell--right drawer-shell--snapshot`. */
  shellClassName?: string
  /** Padding wrapper inside the scroll region (e.g. `drawer-shell-body`, `snapshot-panel-body`). */
  bodyClassName?: string
}

export function SidePanelShell({
  open,
  id,
  titleId,
  title,
  subtitle,
  'aria-labelledby': ariaLabelledBy,
  onClose,
  closeAriaLabel = 'Close panel',
  children,
  belowHeader,
  footer,
  scrollKey,
  shellClassName = '',
  bodyClassName = 'drawer-shell-body',
}: SidePanelShellProps) {
  const isMobileSheet = useIsMobileBottomSheet()
  const panelRef = useRef<HTMLDivElement>(null)
  const hasFooter = footer != null && footer !== false
  const hasBelowHeader = belowHeader != null && belowHeader !== false
  const [latchedShellClass, setLatchedShellClass] = useState(shellClassName)
  const [latchedScrollKey, setLatchedScrollKey] = useState(scrollKey ?? '')

  const {
    isDragging,
    panelStyle,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useBottomSheetDrag({
    enabled: isMobileSheet,
    open,
    panelRef,
    onDismiss: onClose,
  })

  useEffect(() => {
    if (open) {
      setLatchedShellClass(shellClassName)
      setLatchedScrollKey(scrollKey ?? '')
      return
    }
    const t = window.setTimeout(() => {
      setLatchedShellClass(shellClassName)
      setLatchedScrollKey(scrollKey ?? '')
    }, PANEL_CLOSE_MS)
    return () => window.clearTimeout(t)
  }, [open, shellClassName, scrollKey])

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy ?? titleId}
      aria-hidden={!open}
      style={isMobileSheet ? panelStyle : undefined}
      className={[
        'drawer-shell',
        'side-panel-shell',
        hasFooter ? 'drawer-shell--with-footer' : '',
        hasBelowHeader ? 'drawer-shell--with-below-header' : '',
        isMobileSheet ? 'drawer-shell--mobile-sheet' : '',
        isDragging ? 'drawer-shell--dragging' : '',
        latchedShellClass,
        open ? 'drawer-shell--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isMobileSheet ? (
        <BottomSheetHandle
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      ) : null}
      <header className="drawer-shell-header side-panel-shell__header">
        <div className="drawer-shell-header__text">
          <span className="drawer-panel-title" id={titleId}>
            {title}
          </span>
          {subtitle ? <p className="drawer-panel-subtitle">{subtitle}</p> : null}
        </div>
        <CloseButton
          className="panel-close-btn"
          aria-label={closeAriaLabel}
          onPress={onClose}
        />
      </header>
      {hasBelowHeader ? (
        <div className="side-panel-shell__below-header">{belowHeader}</div>
      ) : null}
      <AppOverlayScrollbars
        key={String(latchedScrollKey)}
        className="side-panel-shell__scroll"
        defer={false}
      >
        <div className={`side-panel-shell__body-anim ${bodyClassName}`.trim()}>{children}</div>
      </AppOverlayScrollbars>
      {hasFooter ? (
        <footer className="side-panel-shell__footer">{footer}</footer>
      ) : null}
    </div>
  )
}
