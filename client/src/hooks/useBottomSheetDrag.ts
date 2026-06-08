import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type TouchEvent,
} from 'react'

const DISMISS_RATIO = 0.3

type Options = {
  enabled: boolean
  open: boolean
  panelRef: RefObject<HTMLElement | null>
  onDismiss: () => void
}

export function useBottomSheetDrag({ enabled, open, panelRef, onDismiss }: Options) {
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartYRef = useRef(0)
  const dragOffsetYRef = useRef(0)

  useEffect(() => {
    if (open) return
    dragStartYRef.current = 0
    dragOffsetYRef.current = 0
    setDragOffsetY(0)
    setIsDragging(false)
  }, [open])

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!enabled || !open) return
      dragStartYRef.current = event.touches[0]?.clientY ?? 0
      setIsDragging(true)
    },
    [enabled, open],
  )

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!enabled || !open) return
      const currentY = event.touches[0]?.clientY ?? 0
      const delta = Math.max(0, currentY - dragStartYRef.current)
      dragOffsetYRef.current = delta
      setDragOffsetY(delta)
    },
    [enabled, open],
  )

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return
    const panelHeight = panelRef.current?.offsetHeight ?? 0
    const offset = dragOffsetYRef.current
    if (panelHeight > 0 && offset > panelHeight * DISMISS_RATIO) {
      onDismiss()
    }
    dragStartYRef.current = 0
    dragOffsetYRef.current = 0
    setDragOffsetY(0)
    setIsDragging(false)
  }, [enabled, onDismiss, panelRef])

  const panelStyle: CSSProperties | undefined =
    enabled && open && (isDragging || dragOffsetY > 0)
      ? { transform: `translateY(${dragOffsetY}px)` }
      : undefined

  return {
    isDragging,
    panelStyle,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
