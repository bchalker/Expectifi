import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { BottomSheetHandle } from '../ui/BottomSheetHandle'
import { BottomSheetPortal } from '../ui/BottomSheetPortal'
import { useBottomSheetDrag } from '../../hooks/useBottomSheetDrag'
import { useWtrDestPanelMobileSheet } from '../../hooks/useWtrDestPanelMobileSheet'
import type { ScoredMapCity, MapFilters } from '../../lib/whereToRetire/cityMapScoring'
import type { RetirementPreferences } from '../../types/preferences'
import { buildBudgetBreakdownDisplay } from '../../utils/costOfLiving'
import { CityDetailPanel } from './cityDetail/CityDetailPanel'
import './RetirementDestinationPanel.scss'

export type DestinationListNav = {
  index: number
  totalCount: number
  onPrev: () => void
  onNext: () => void
}

type Props = {
  scored: ScoredMapCity | null
  monthlyIncome: number
  mapFilters: Pick<MapFilters, 'includeHealthIns' | 'healthInsMonthlyUsd'>
  preferences: RetirementPreferences
  open: boolean
  onClose: () => void
  listNav: DestinationListNav | null
}

export function RetirementDestinationPanel({
  scored,
  monthlyIncome,
  mapFilters,
  preferences,
  open,
  onClose,
  listNav,
}: Props) {
  const mobileSheet = useWtrDestPanelMobileSheet()
  const [slideOpen, setSlideOpen] = useState(false)
  const sheetRef = useRef<HTMLElement>(null)

  const {
    isDragging,
    panelStyle: dragPanelStyle,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useBottomSheetDrag({
    enabled: mobileSheet,
    open: open && slideOpen,
    panelRef: sheetRef,
    onDismiss: onClose,
  })

  useEffect(() => {
    if (!open) {
      setSlideOpen(false)
      return
    }
    let frame2 = 0
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => setSlideOpen(true))
    })
    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const budgetBreakdown = useMemo(
    () => (scored ? buildBudgetBreakdownDisplay(scored.city) : null),
    [scored],
  )

  if (!scored || !budgetBreakdown) return null

  const sheetStyle: CSSProperties | undefined = mobileSheet ? dragPanelStyle : undefined

  return (
    <BottomSheetPortal enabled>
      {mobileSheet ? (
        <div
          className={[
            'mobile-bottom-sheet-backdrop',
            slideOpen && 'mobile-bottom-sheet-backdrop--open',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        ref={sheetRef}
        className={[
          'wtr-dest-panel',
          slideOpen && 'wtr-dest-panel--open',
          mobileSheet && 'wtr-dest-panel--sheet',
          isDragging && 'mobile-bottom-sheet-panel--dragging',
        ]
          .filter(Boolean)
          .join(' ')}
        style={sheetStyle}
        role="dialog"
        aria-modal={mobileSheet}
        aria-hidden={!open}
        aria-labelledby="wtr-dest-panel-title"
      >
        {mobileSheet ? (
          <BottomSheetHandle
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        ) : null}
        <CityDetailPanel
          scored={scored}
          monthlyIncome={monthlyIncome}
          mapFilters={mapFilters}
          preferences={preferences}
          budgetBreakdown={budgetBreakdown}
          listNav={listNav}
          mobileSheet={mobileSheet}
          onClose={onClose}
        />
      </aside>
    </BottomSheetPortal>
  )
}
