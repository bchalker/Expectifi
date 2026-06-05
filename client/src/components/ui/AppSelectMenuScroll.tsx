import { forwardRef, useRef, type ReactNode } from 'react'
import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentRef,
} from 'overlayscrollbars-react'
import { OverlayScrollbars } from 'overlayscrollbars'
import type { PartialOptions } from 'overlayscrollbars'
import { APP_OVERLAY_SCROLLBARS_OPTIONS, overlayScrollbarsViewport } from './AppOverlayScrollbars'
import 'overlayscrollbars/styles/overlayscrollbars.css'
import './AppSelectMenuScroll.scss'

const MENU_SCROLL_OPTIONS: PartialOptions = {
  overflow: { x: 'hidden', y: 'scroll' },
  scrollbars: APP_OVERLAY_SCROLLBARS_OPTIONS.scrollbars,
}

type Props = {
  children: ReactNode
  className?: string
}

/** Thin OverlayScrollbars wrapper for HeroUI select popover menus. */
export const AppSelectMenuScroll = forwardRef<OverlayScrollbarsComponentRef, Props>(
  function AppSelectMenuScroll({ children, className }, ref) {
    const localRef = useRef<OverlayScrollbarsComponentRef>(null)

    const setRef = (instance: OverlayScrollbarsComponentRef | null) => {
      localRef.current = instance
      if (typeof ref === 'function') ref(instance)
      else if (ref) ref.current = instance
    }

    const refresh = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          localRef.current?.osInstance()?.update(true)
        })
      })
    }

    return (
      <OverlayScrollbarsComponent
        ref={setRef}
        className={['app-select-menu-scroll', className].filter(Boolean).join(' ')}
        options={MENU_SCROLL_OPTIONS}
        defer={false}
        data-overlayscrollbars-initialize=""
        events={{ initialized: refresh }}
      >
        {children}
      </OverlayScrollbarsComponent>
    )
  },
)

/** Re-measure OverlayScrollbars after a portaled menu opens. */
export function refreshOverlayScrollbarsFrom(item: HTMLElement | null) {
  const host = item?.closest('[data-overlayscrollbars-initialize]') as HTMLElement | null
  if (!host) return
  const instance = OverlayScrollbars(host)
  if (!instance) return
  requestAnimationFrame(() => {
    requestAnimationFrame(() => instance.update(true))
  })
}

export { overlayScrollbarsViewport }

/** @deprecated Use overlayScrollbarsViewport */
export const selectMenuScrollElement = overlayScrollbarsViewport
