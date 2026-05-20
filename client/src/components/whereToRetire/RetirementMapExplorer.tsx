import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import { AnimatedCount } from '../ui/AnimatedCount'
import { useWtrMapHeight } from '../../hooks/useWtrMapHeight'
import type { ExplorationIncomeRange } from '../../lib/whereToRetire/budgetExplorationStats'
import { scoreAndFilterMapCities, type MapFilters } from '../../lib/whereToRetire/cityMapScoring'
import { RetirementDestinationCard } from './RetirementDestinationCard'
import { RetirementDestinationPanel } from './RetirementDestinationPanel'
import { WtrCompareBar } from './WtrCompareBar'
import { RetirementLeafletMap } from './RetirementLeafletMap'
import { RetirementMapFilters, WtrMapFiltersInline, WtrMapSortSelect } from './RetirementMapFilters'
import './RetirementMapExplorer.scss'

type Props = {
  explorationRange: ExplorationIncomeRange
  filters: MapFilters
  onFiltersChange: (next: MapFilters | ((prev: MapFilters) => MapFilters)) => void
  headerSlot?: ReactNode
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
  compareIds: string[]
  compareOverlayOpen?: boolean
  onToggleCompare: (cityId: string) => void
  onClearCompare: () => void
  onViewComparison: () => void
}

const LIST_LIMIT = 50

function notifyMapResize() {
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
  window.setTimeout(() => window.dispatchEvent(new Event('resize')), 340)
}

const MAX_COMPARE_CITIES = 5

export function RetirementMapExplorer({
  explorationRange,
  filters,
  onFiltersChange,
  headerSlot,
  filtersOpen,
  onFiltersOpenChange,
  compareIds,
  compareOverlayOpen = false,
  onToggleCompare,
  onClearCompare,
  onViewComparison,
}: Props) {
  const chromeRef = useRef<HTMLDivElement>(null)
  const mapStageRef = useRef<HTMLDivElement>(null)
  const mapRowHeightPx = useWtrMapHeight(chromeRef)
  const [mapStageHeightPx, setMapStageHeightPx] = useState(mapRowHeightPx)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [listPanelOpen, setListPanelOpen] = useState(true)
  const scenarioIncomeMax = explorationRange.max

  const filteredCities = useMemo(
    () => scoreAndFilterMapCities(scenarioIncomeMax, filters),
    [filters, scenarioIncomeMax],
  )

  const listCities = useMemo(
    () => filteredCities.slice(0, LIST_LIMIT),
    [filteredCities],
  )

  const structuralFiltersKey = useMemo(
    () =>
      [
        explorationRange.min,
        explorationRange.max,
        filters.fitsMyIncome ? '1' : '0',
        filters.climate,
        [...filters.regions].sort().join(','),
        filters.regionScope,
        filters.sortBy,
        filters.englishSpeaking ? '1' : '0',
        filters.medicareAccess ? '1' : '0',
        filters.hideAdvisories ? '1' : '0',
      ].join('|'),
    [
      explorationRange.max,
      explorationRange.min,
      filters.climate,
      filters.englishSpeaking,
      filters.fitsMyIncome,
      filters.hideAdvisories,
      filters.medicareAccess,
      filters.regionScope,
      filters.regions,
      filters.sortBy,
    ],
  )

  const listCardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listCardsRef.current
    if (!el) return
    el.classList.remove('wtr-explorer__list-cards--refresh')
    void el.offsetHeight
    el.classList.add('wtr-explorer__list-cards--refresh')
  }, [structuralFiltersKey])

  useEffect(() => {
    if (!selectedId) return
    if (!filteredCities.some((item) => item.city.id === selectedId)) {
      setSelectedId(null)
      setPanelOpen(false)
    }
  }, [filteredCities, selectedId])

  useLayoutEffect(() => {
    const stage = mapStageRef.current
    if (!stage) return

    const measure = () => {
      const next = stage.clientHeight
      if (next > 0) setMapStageHeightPx(next)
    }

    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(stage)
    window.addEventListener('resize', measure)

    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [mapRowHeightPx, listCities.length])

  const selectedScored = useMemo(
    () => filteredCities.find((s) => s.city.id === selectedId) ?? null,
    [filteredCities, selectedId],
  )

  const openDestination = useCallback((id: string) => {
    setSelectedId(id)
    setPanelOpen(true)
  }, [])

  const closePanel = useCallback(() => {
    setPanelOpen(false)
  }, [])

  const collapseListPanel = useCallback(() => {
    setListPanelOpen(false)
  }, [])

  const expandListPanel = useCallback(() => {
    setListPanelOpen(true)
  }, [])

  const closeFiltersPanel = useCallback(() => {
    onFiltersOpenChange(false)
    notifyMapResize()
  }, [onFiltersOpenChange])

  useEffect(() => {
    if (!filtersOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFiltersPanel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [filtersOpen, closeFiltersPanel])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onMqChange = () => {
      if (mq.matches) onFiltersOpenChange(false)
    }
    onMqChange()
    mq.addEventListener('change', onMqChange)
    return () => mq.removeEventListener('change', onMqChange)
  }, [onFiltersOpenChange])

  return (
    <div className="wtr-explorer">
      <div ref={chromeRef} className="wtr-explorer__chrome">
        {headerSlot ? (
          <div className="wtr-explorer__chrome-slot">{headerSlot}</div>
        ) : null}
        <WtrMapFiltersInline filters={filters} onChange={onFiltersChange} />
      </div>

      <div
        className={[
          'wtr-explorer__map-row',
          !listPanelOpen && 'wtr-explorer__map-row--list-collapsed',
          filtersOpen && 'wtr-explorer__map-row--filters-open',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ height: mapRowHeightPx }}
      >
        {filtersOpen ? (
          <button
            type="button"
            className="wtr-explorer__filter-backdrop"
            aria-label="Close filters"
            onClick={closeFiltersPanel}
          />
        ) : null}

        <RetirementMapFilters
          open={filtersOpen}
          onClose={closeFiltersPanel}
          filters={filters}
          onChange={onFiltersChange}
        />
        <div ref={mapStageRef} className="wtr-explorer__map-stage">
          <RetirementLeafletMap
            heightPx={mapStageHeightPx}
            destinations={filteredCities}
            selectedId={selectedId}
            fitKey={structuralFiltersKey}
            onSelect={openDestination}
          />
        </div>

        <aside
          id="wtr-explorer-list-panel"
          className="wtr-explorer__list-panel"
          aria-label="City list"
          aria-hidden={!listPanelOpen}
        >
          <div className="wtr-explorer__list-panel-inner">
            <header className="wtr-explorer__list-head">
              <WtrMapSortSelect
                className="wtr-map-filters__sort-select--list-head"
                filters={filters}
                onChange={onFiltersChange}
              />
              <button
                type="button"
                className="wtr-explorer__list-collapse"
                aria-expanded={listPanelOpen}
                aria-controls="wtr-explorer-list-panel"
                aria-label="Hide city list"
                onClick={collapseListPanel}
              >
                <IconChevronLeft size={18} stroke={1.5} aria-hidden />
              </button>
            </header>
            {listCities.length === 0 ? (
              <p className="wtr-dest-card-list__empty wtr-explorer__list-empty">
                No cities match your filters. Try clearing filters or adjusting your income scenario above.
              </p>
            ) : (
              <SimpleBar
                className="wtr-explorer__list-scroll"
                autoHide={false}
              >
                <div className="wtr-explorer__list-scroll-inner">
                  <div
                    ref={listCardsRef}
                    className="wtr-dest-card-list wtr-explorer__list-cards"
                  >
                  {listCities.map((item, index) => (
                    <RetirementDestinationCard
                      key={item.city.id}
                      scored={item}
                      rank={index + 1}
                      active={selectedId === item.city.id}
                      staggerIndex={index}
                      onSelect={() => openDestination(item.city.id)}
                      showCompareToggle
                      compareSelected={compareIds.includes(item.city.id)}
                      compareAtMax={compareIds.length >= MAX_COMPARE_CITIES}
                      onToggleCompare={() => onToggleCompare(item.city.id)}
                    />
                  ))}
                  </div>
                </div>
              </SimpleBar>
            )}
          </div>
        </aside>

        {!listPanelOpen ? (
          <button
            type="button"
            className="wtr-explorer__list-reopen"
            aria-expanded={listPanelOpen}
            aria-controls="wtr-explorer-list-panel"
            onClick={expandListPanel}
          >
            <IconChevronRight size={16} stroke={1.5} aria-hidden />
            <span className="wtr-explorer__list-reopen-label">Top cities</span>
            <span className="wtr-explorer__list-reopen-count">
              <AnimatedCount
                value={filteredCities.length}
                className="wtr-explorer__list-reopen-count-num"
              />
            </span>
          </button>
        ) : null}
      </div>

      <RetirementDestinationPanel
        scored={selectedScored}
        monthlyIncome={scenarioIncomeMax}
        open={panelOpen && selectedScored != null}
        onClose={closePanel}
        compareSelected={
          selectedScored != null && compareIds.includes(selectedScored.city.id)
        }
        compareAtMax={compareIds.length >= MAX_COMPARE_CITIES}
        onToggleCompare={() => {
          if (selectedScored) onToggleCompare(selectedScored.city.id)
        }}
      />

      {!compareOverlayOpen ? (
        <WtrCompareBar
          count={compareIds.length}
          onViewComparison={onViewComparison}
          onClearAll={onClearCompare}
        />
      ) : null}
    </div>
  )
}
