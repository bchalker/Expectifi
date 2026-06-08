import type { TouchEventHandler } from 'react'

type Props = {
  onTouchStart: TouchEventHandler<HTMLDivElement>
  onTouchMove: TouchEventHandler<HTMLDivElement>
  onTouchEnd: TouchEventHandler<HTMLDivElement>
  onTouchCancel?: TouchEventHandler<HTMLDivElement>
}

export function BottomSheetHandle({
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
}: Props) {
  return (
    <div
      className="bottom-sheet-handle-wrap"
      aria-hidden
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel ?? onTouchEnd}
    >
      <div className="bottom-sheet-handle" />
    </div>
  )
}
