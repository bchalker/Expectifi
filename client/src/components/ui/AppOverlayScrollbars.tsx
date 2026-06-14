import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import {
  OverlayScrollbarsComponent,
  type OverlayScrollbarsComponentRef,
} from 'overlayscrollbars-react'
import type { PartialOptions } from 'overlayscrollbars'
import 'overlayscrollbars/styles/overlayscrollbars.css'

export const APP_OVERLAY_SCROLLBARS_OPTIONS: PartialOptions = {
  scrollbars: {
    theme: 'os-theme-app-thin',
    visibility: 'auto',
    autoHide: 'scroll',
    autoHideDelay: 1300,
    autoHideSuspend: true,
  },
}

type Props = Omit<
  ComponentPropsWithoutRef<typeof OverlayScrollbarsComponent>,
  'options' | 'defer' | 'children'
> & {
  children: ReactNode
  className?: string
  options?: PartialOptions
  /** Defer init until idle — disable for menus that scroll on first open. */
  defer?: boolean
}

/** Thin themed OverlayScrollbars wrapper used across panels, modals, and menus. */
export const AppOverlayScrollbars = forwardRef<OverlayScrollbarsComponentRef, Props>(
  function AppOverlayScrollbars({ children, className, options, defer = true, ...rest }, ref) {
    const mergedOptions: PartialOptions = {
      ...APP_OVERLAY_SCROLLBARS_OPTIONS,
      ...options,
      scrollbars: {
        ...APP_OVERLAY_SCROLLBARS_OPTIONS.scrollbars,
        ...options?.scrollbars,
      },
    }

    return (
      <OverlayScrollbarsComponent
        ref={ref}
        className={className}
        options={mergedOptions}
        defer={defer}
        data-overlayscrollbars-initialize=""
        {...rest}
      >
        {children}
      </OverlayScrollbarsComponent>
    )
  },
)

/** Scroll viewport for a portaled select menu item (OverlayScrollbars or native list). */
export function overlayScrollbarsViewport(item: HTMLElement): HTMLElement | null {
  return (
    item.closest('[data-overlayscrollbars-viewport]') ??
    item.closest('[data-slot="list-box"]')
  )
}
