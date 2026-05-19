import { Popover } from '@heroui/react'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './AnchoredHoverCell.scss'

export type AnchoredHoverPanelOptions = {
  panelWidth?: number
  panelMaxHeight?: number
}

type Props = {
  children: ReactNode
  panel: ReactNode
  className?: string
  bodyClassName?: string
  panelClassName?: string
} & AnchoredHoverPanelOptions

const CLOSE_DELAY_MS = 220

function isNodeInHoverZone(target: EventTarget | null, trigger: HTMLElement | null, panel: HTMLElement | null) {
  if (!(target instanceof Node)) return false
  return Boolean(trigger?.contains(target) || panel?.contains(target))
}

export function AnchoredHoverCell({
  children,
  panel,
  className,
  bodyClassName,
  panelClassName,
  panelWidth = 280,
  panelMaxHeight = 320,
}: Props) {
  const cellRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverRef = useRef({ trigger: false, panel: false })
  const [open, setOpen] = useState(false)

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const openPanel = useCallback(() => {
    clearCloseTimer()
    setOpen(true)
  }, [clearCloseTimer])

  const scheduleClose = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }, [clearCloseTimer])

  const syncHoverOpen = useCallback(() => {
    const { trigger, panel: overPanel } = hoverRef.current
    if (trigger || overPanel) {
      openPanel()
    } else {
      scheduleClose()
    }
  }, [openPanel, scheduleClose])

  const onTriggerEnter = useCallback(() => {
    hoverRef.current.trigger = true
    syncHoverOpen()
  }, [syncHoverOpen])

  const onTriggerLeave = useCallback((e: React.PointerEvent) => {
    if (isNodeInHoverZone(e.relatedTarget, cellRef.current, panelRef.current)) return
    hoverRef.current.trigger = false
    syncHoverOpen()
  }, [syncHoverOpen])

  const onPanelEnter = useCallback(() => {
    hoverRef.current.panel = true
    syncHoverOpen()
  }, [syncHoverOpen])

  const onPanelLeave = useCallback((e: React.PointerEvent) => {
    if (isNodeInHoverZone(e.relatedTarget, cellRef.current, panelRef.current)) return
    hoverRef.current.panel = false
    syncHoverOpen()
  }, [syncHoverOpen])

  const onTriggerFocus = useCallback(() => {
    openPanel()
  }, [openPanel])

  const onTriggerBlur = useCallback((e: React.FocusEvent) => {
    if (isNodeInHoverZone(e.relatedTarget, cellRef.current, panelRef.current)) return
    hoverRef.current.trigger = false
    syncHoverOpen()
  }, [syncHoverOpen])

  useEffect(() => {
    if (!open) return
    const viewportRoot = cellRef.current?.closest('.wtr-grid__viewport')
    const viewport =
      viewportRoot?.querySelector<HTMLElement>('.simplebar-content-wrapper') ?? viewportRoot
    let attached = false

    const onScroll = () => {
      hoverRef.current = { trigger: false, panel: false }
      setOpen(false)
    }

    const attachTimer = window.setTimeout(() => {
      attached = true
      viewport?.addEventListener('scroll', onScroll, { passive: true })
    }, 180)

    return () => {
      window.clearTimeout(attachTimer)
      if (attached) viewport?.removeEventListener('scroll', onScroll)
    }
  }, [open])

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

  const rootClass = ['wtr-hover-cell', open ? 'wtr-hover-cell--open' : '', className]
    .filter(Boolean)
    .join(' ')

  const bodyClass = ['wtr-hover-cell__body', bodyClassName].filter(Boolean).join(' ')

  const popoverClass = ['wtr-hover-popover', panelClassName].filter(Boolean).join(' ')

  const popoverStyle = {
    '--wtr-popover-w': `${panelWidth}px`,
    '--wtr-popover-max-h': `${panelMaxHeight}px`,
  } as CSSProperties

  return (
    <Popover
      isOpen={open}
      onOpenChange={(next) => {
        if (next) openPanel()
      }}
    >
      <Popover.Trigger className="wtr-hover-cell__trigger">
        <div
          ref={cellRef}
          className={rootClass}
          tabIndex={0}
          onPointerEnter={onTriggerEnter}
          onPointerLeave={onTriggerLeave}
          onFocus={onTriggerFocus}
          onBlur={onTriggerBlur}
        >
          <span className="wtr-hover-cell__corner" aria-hidden />
          <div className={bodyClass}>{children}</div>
        </div>
      </Popover.Trigger>
      <Popover.Content
        placement="bottom end"
        offset={6}
        shouldFlip
        className={popoverClass}
        style={popoverStyle}
      >
        <div
          ref={panelRef}
          className="wtr-hover-popover__hit"
          onPointerEnter={onPanelEnter}
          onPointerLeave={onPanelLeave}
        >
          <Popover.Arrow className="wtr-hover-popover__arrow" />
          <Popover.Dialog className="wtr-hover-popover__dialog">{panel}</Popover.Dialog>
        </div>
      </Popover.Content>
    </Popover>
  )
}
