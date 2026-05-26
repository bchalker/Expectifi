import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import { CloseButton } from '@heroui/react'
import './SidePanelShell.scss'

/** Must match `transform` duration on `.drawer-shell` in PanelChrome.scss */
const PANEL_CLOSE_MS = 280

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
  const hasFooter = footer != null && footer !== false
  const hasBelowHeader = belowHeader != null && belowHeader !== false
  const [latchedShellClass, setLatchedShellClass] = useState(shellClassName)
  const [latchedScrollKey, setLatchedScrollKey] = useState(scrollKey ?? '')

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
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy ?? titleId}
      aria-hidden={!open}
      className={[
        'drawer-shell',
        'side-panel-shell',
        hasFooter ? 'drawer-shell--with-footer' : '',
        hasBelowHeader ? 'drawer-shell--with-below-header' : '',
        latchedShellClass,
        open ? 'drawer-shell--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="drawer-shell-header side-panel-shell__header">
        <div className="drawer-shell-header__text">
          <span className="drawer-panel-title" id={titleId}>
            {title}
          </span>
          {subtitle ? <p className="drawer-panel-subtitle">{subtitle}</p> : null}
        </div>
        <CloseButton aria-label={closeAriaLabel} onPress={onClose} />
      </header>
      {hasBelowHeader ? (
        <div className="side-panel-shell__below-header">{belowHeader}</div>
      ) : null}
      <SimpleBar
        key={String(latchedScrollKey)}
        className="side-panel-shell__scroll"
        autoHide={false}
      >
        <div className={`side-panel-shell__body-anim ${bodyClassName}`.trim()}>{children}</div>
      </SimpleBar>
      {hasFooter ? (
        <footer className="side-panel-shell__footer">{footer}</footer>
      ) : null}
    </div>
  )
}
