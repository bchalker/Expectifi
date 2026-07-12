import {
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from 'react'
import { BottomSheetHandle } from './BottomSheetHandle'
import { BottomSheetPortal } from './BottomSheetPortal'
import { useBottomSheetStackRegistration } from '../../context/BottomSheetStackContext'
import { useBottomSheetDrag } from '../../hooks/useBottomSheetDrag'
import { useBottomSheetSlideShadow } from '../../hooks/useBottomSheetSlideShadow'
import { useIsMobileBottomSheet } from '../../hooks/useMobileBottomSheet'

type Props<T extends ElementType = 'aside'> = {
  as?: T
  open: boolean
  onClose: () => void
  showBackdrop?: boolean
  backdropClassName?: string
  className?: string
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className' | 'style'>

export function BottomSheetAside<T extends ElementType = 'aside'>({
  as,
  open,
  onClose,
  showBackdrop = true,
  backdropClassName = '',
  className = '',
  children,
  ...rest
}: Props<T>) {
  const Tag = as ?? 'aside'
  const isMobileSheet = useIsMobileBottomSheet()
  const panelRef = useRef<HTMLElement>(null)
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

  const isSliding = useBottomSheetSlideShadow(panelRef, open, isMobileSheet)

  useBottomSheetStackRegistration(open)

  return (
    <BottomSheetPortal enabled={isMobileSheet}>
      {isMobileSheet && showBackdrop && open ? (
        <div
          className={[
            'mobile-bottom-sheet-backdrop',
            'mobile-bottom-sheet-backdrop--open',
            backdropClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <Tag
        {...rest}
        ref={panelRef}
        style={isMobileSheet ? panelStyle : undefined}
        className={[
          className,
          isMobileSheet ? 'mobile-bottom-sheet-panel' : '',
          isSliding ? 'mobile-bottom-sheet-panel--sliding' : '',
          isDragging ? 'mobile-bottom-sheet-panel--dragging' : '',
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
        {children}
      </Tag>
    </BottomSheetPortal>
  )
}
