import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

type Props = {
  enabled: boolean
  children: ReactNode
}

/** Renders bottom sheets on document.body so they aren't clipped by scaled app content. */
export function BottomSheetPortal({ enabled, children }: Props) {
  if (!enabled || typeof document === 'undefined') {
    return <>{children}</>
  }
  return createPortal(children, document.body)
}
