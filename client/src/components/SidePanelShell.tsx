import type { ReactNode } from 'react'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import { CloseButton } from '@heroui/react'
import './SidePanelShell.scss'

export type SidePanelShellProps = {
  open: boolean
  id?: string
  titleId: string
  title: ReactNode
  'aria-labelledby'?: string
  onClose: () => void
  closeAriaLabel?: string
  children: ReactNode
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
  'aria-labelledby': ariaLabelledBy,
  onClose,
  closeAriaLabel = 'Close panel',
  children,
  footer,
  scrollKey,
  shellClassName = '',
  bodyClassName = 'drawer-shell-body',
}: SidePanelShellProps) {
  const hasFooter = footer != null && footer !== false

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
        shellClassName,
        open ? 'drawer-shell--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="drawer-shell-header side-panel-shell__header">
        <span className="drawer-panel-title" id={titleId}>
          {title}
        </span>
        <CloseButton aria-label={closeAriaLabel} onPress={onClose} />
      </header>
      <SimpleBar
        key={`${open}:${scrollKey ?? ''}`}
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
