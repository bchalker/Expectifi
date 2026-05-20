import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconArrowLeft } from '@tabler/icons-react'
import { AnimatedCount } from '../components/ui/AnimatedCount'
import { BudgetExplorationHero } from '../components/whereToRetire/BudgetExplorationHero'
import { RetirementMapExplorer } from '../components/whereToRetire/RetirementMapExplorer'
import { WtrMapFilterButton } from '../components/whereToRetire/WtrMapFilterButton'
import { WtrComparisonTableView } from '../components/whereToRetire/WtrComparisonTableView'
import type { ComputedSnapshot } from '../lib/computeResults'
import { APP_DASHBOARD_PATH, navigateApp } from '../lib/appPaths'
import {
  ALL_DESTINATION_REGIONS,
  countActiveMapFilters,
  countFitsIncomeWithFilters,
  DEFAULT_MAP_FILTERS,
  type MapFilters,
} from '../lib/whereToRetire/cityMapScoring'
import {
  defaultExplorationIncomeRange,
  getTotalMapCityCount,
  isDefaultExplorationIncomeRange,
  type ExplorationIncomeRange,
} from '../lib/whereToRetire/budgetExplorationStats'
import type { MapCity } from '../utils/costOfLiving'
import './WhereToRetire.scss'

const MAX_COMPARE_CITIES = 5

type WtrViewMode = 'map' | 'compare'

type Props = {
  c: ComputedSnapshot
}

export function WhereToRetire({ c }: Props) {
  const grossMonthlyIncome = c.grossMon
  const [viewMode, setViewMode] = useState<WtrViewMode>('map')
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [baselineCity, setBaselineCity] = useState<MapCity | null>(null)
  const totalMapCities = useMemo(() => getTotalMapCityCount(), [])
  const [explorationRange, setExplorationRange] = useState<ExplorationIncomeRange>(
    () => defaultExplorationIncomeRange(grossMonthlyIncome),
  )
  const explorationIncomeMax = explorationRange.max
  const [mapFilters, setMapFilters] = useState<MapFilters>(() => ({
    ...DEFAULT_MAP_FILTERS,
    regions: [...ALL_DESTINATION_REGIONS],
  }))
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    setExplorationRange(defaultExplorationIncomeRange(grossMonthlyIncome))
  }, [grossMonthlyIncome])

  const showingCityCount = useMemo(
    () => countFitsIncomeWithFilters(explorationIncomeMax, mapFilters),
    [explorationIncomeMax, mapFilters],
  )

  const activeFilterCount = useMemo(
    () =>
      countActiveMapFilters(mapFilters) +
      (isDefaultExplorationIncomeRange(grossMonthlyIncome, explorationRange) ? 0 : 1),
    [grossMonthlyIncome, explorationRange, mapFilters],
  )

  const toggleFiltersPanel = useCallback(() => {
    setFiltersOpen((open) => !open)
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 340)
  }, [])

  useEffect(() => {
    if (!filtersOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [filtersOpen])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onMqChange = () => {
      if (mq.matches) setFiltersOpen(false)
    }
    onMqChange()
    mq.addEventListener('change', onMqChange)
    return () => mq.removeEventListener('change', onMqChange)
  }, [])

  const toggleCompare = useCallback((cityId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(cityId)) return prev.filter((id) => id !== cityId)
      if (prev.length >= MAX_COMPARE_CITIES) return prev
      return [...prev, cityId]
    })
  }, [])

  const clearCompare = useCallback(() => {
    setCompareIds([])
    setBaselineCity(null)
  }, [])

  const removeCompare = useCallback((cityId: string) => {
    setCompareIds((prev) => prev.filter((id) => id !== cityId))
  }, [])

  return (
    <div className="where-to-retire">
      <div
        className={[
          'where-to-retire__body',
          'main',
          'app-page',
          'app-page--where-to-retire',
          'where-to-retire__body--map',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          className="app-page-back"
          onClick={() => navigateApp(APP_DASHBOARD_PATH)}
        >
          <IconArrowLeft size={16} stroke={1.5} aria-hidden />
          Back to dashboard
        </button>

        <BudgetExplorationHero
          section="intro"
          planMonthlyIncome={grossMonthlyIncome}
          explorationRange={explorationRange}
          onExplorationRangeChange={setExplorationRange}
        />
        <div
          className={[
            'where-to-retire__main-panel',
            viewMode === 'compare' && 'where-to-retire__main-panel--compare-open',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <BudgetExplorationHero
            section="panelSummary"
            embedded
            planMonthlyIncome={grossMonthlyIncome}
            explorationRange={explorationRange}
            onExplorationRangeChange={setExplorationRange}
          />
          <div className="where-to-retire__income-toolbar">
            <div className="where-to-retire__showing-count" aria-live="polite">
              <p className="where-to-retire__showing-count-primary">
                Showing{' '}
                <AnimatedCount
                  value={showingCityCount}
                  className="where-to-retire__showing-count-num"
                />{' '}
                cities
              </p>
              <p className="where-to-retire__showing-count-sub">
                Based on the range slider and filters
              </p>
            </div>
            <div className="where-to-retire__income-toolbar-slider">
              <BudgetExplorationHero
                section="slider"
                embedded
                planMonthlyIncome={grossMonthlyIncome}
                explorationRange={explorationRange}
                onExplorationRangeChange={setExplorationRange}
              />
            </div>
            <div className="where-to-retire__income-toolbar-actions">
              <WtrMapFilterButton
                active={activeFilterCount > 0}
                activeFilterCount={activeFilterCount}
                filtersOpen={filtersOpen}
                onToggle={toggleFiltersPanel}
              />
            </div>
          </div>
          <div className="where-to-retire__main-panel-map">
            <RetirementMapExplorer
              explorationRange={explorationRange}
              filters={mapFilters}
              onFiltersChange={setMapFilters}
              filtersOpen={filtersOpen}
              onFiltersOpenChange={setFiltersOpen}
              compareIds={compareIds}
              compareOverlayOpen={viewMode === 'compare'}
              onToggleCompare={toggleCompare}
              onClearCompare={clearCompare}
              onViewComparison={() => setViewMode('compare')}
            />
            {viewMode === 'compare' ? (
              <div
                className="where-to-retire__compare-overlay"
                role="dialog"
                aria-modal="true"
                aria-label="City comparison"
              >
                <WtrComparisonTableView
                  monthlyIncome={explorationIncomeMax}
                  compareIds={compareIds}
                  baselineCity={baselineCity}
                  onBaselineCityChange={setBaselineCity}
                  onBackToMap={() => setViewMode('map')}
                  onClearAll={clearCompare}
                  onRemoveCompare={removeCompare}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <footer className="where-to-retire__footer">
        <p className="where-to-retire__catalog-note">
          {totalMapCities.toLocaleString()} cities in our worldwide catalog.
        </p>
        <p className="where-to-retire__disclaimer" role="note">
          All figures are educational estimates only — not tax, legal,
          financial, or immigration advice. Consult qualified professionals
          before relocating. Sources:{' '}
          <a
            href="https://www.irs.gov/individuals/international-taxpayers"
            target="_blank"
            rel="noopener noreferrer"
          >
            IRS
          </a>
          {' · '}
          <a
            href="https://taxfoundation.org/data/all/state/state-income-tax-rates/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tax Foundation
          </a>
        </p>
      </footer>
    </div>
  )
}
