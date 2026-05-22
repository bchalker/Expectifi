import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react'

type Options = {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  panelWidthPx?: number
  gapPx?: number
}

export function useAnchoredPanelPosition({
  open,
  anchorRef,
  panelWidthPx = 352,
  gapPx = 8,
}: Options): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties | undefined>(undefined)

  useLayoutEffect(() => {
    if (!open) {
      setStyle(undefined)
      return
    }

    const update = () => {
      const anchor = anchorRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      const maxWidth = Math.min(panelWidthPx, window.innerWidth - 24)
      let left = rect.right - maxWidth
      left = Math.max(12, Math.min(left, window.innerWidth - maxWidth - 12))
      const top = rect.bottom + gapPx
      const maxHeight = Math.max(160, window.innerHeight - top - 16)

      setStyle({
        position: 'fixed',
        top,
        left,
        width: maxWidth,
        maxHeight,
        zIndex: 60,
      })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, anchorRef, panelWidthPx, gapPx])

  return style
}
