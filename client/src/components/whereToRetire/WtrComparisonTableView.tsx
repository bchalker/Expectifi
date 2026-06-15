import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconArrowLeft } from '@tabler/icons-react'
import { useWtrComparisonColumns, resolveCompareScored } from '../../hooks/useWtrComparisonColumns'
import {
  COMPARISON_TABLE_ROWS,
  getComparisonCellDisplay,
  getComparisonHighlightClass,
  isComparisonDirectFlightsBadgeRow,
  isComparisonEnglishBadgeRow,
  type ComparisonColumnData,
} from '../../lib/whereToRetire/comparisonTableModel'
import { DirectFlightsBadge } from './DestinationGettingThereTab'
import { EnglishProficiencyBadge } from './DestinationPeopleCultureTab'
import { getEnglishProficiency } from '../../utils/englishProficiency'
import './DestinationGettingThereTab.scss'
import './DestinationPeopleCultureTab.scss'
import { scoreMapCity } from '../../lib/whereToRetire/cityMapScoring'
import { getAllMapCities, type MapCity } from '../../utils/costOfLiving'
import { CountryFlag } from '../ui/CountryFlag'
import { AppChip } from '../ui/AppChip'
import { WtrAffordabilityScoreBar } from './WtrAffordabilityScoreBar'
import './WtrComparisonTableView.scss'

type Props = {
  monthlyIncome: number
  compareIds: string[]
  baselineCity: MapCity | null
  onBaselineCityChange: (city: MapCity | null) => void
  onBackToMap: () => void
  onClearAll: () => void
  onRemoveCompare: (cityId: string) => void
  toolbarEnd?: ReactNode
}

function ComparisonCellValue({
  rowId,
  col,
  monthlyIncome,
}: {
  rowId: string
  col: ComparisonColumnData
  monthlyIncome: number
}) {
  if (isComparisonEnglishBadgeRow(rowId)) {
    const level = getEnglishProficiency(col.city.country)
    if (!level) return <span className="wtr-compare-table__cell-value">—</span>
    return (
      <span className="wtr-compare-table__cell-value wtr-compare-table__cell-value--badge">
        <EnglishProficiencyBadge level={level} />
      </span>
    )
  }
  if (isComparisonDirectFlightsBadgeRow(rowId)) {
    if (!col.gettingThere) return <span className="wtr-compare-table__cell-value">—</span>
    return (
      <span className="wtr-compare-table__cell-value wtr-compare-table__cell-value--badge">
        <DirectFlightsBadge direct={col.gettingThere.direct_from_us} />
      </span>
    )
  }
  return (
    <span className="wtr-compare-table__cell-value">
      {getComparisonCellDisplay(rowId, col, monthlyIncome)}
    </span>
  )
}

type CityHeaderProps = {
  col: ComparisonColumnData | null
  monthlyIncome: number
  baselineCity?: MapCity | null
  isBaseline?: boolean
  onRemove?: () => void
  dropdownOpen?: boolean
  onToggleDropdown?: () => void
  onCloseDropdown?: () => void
  searchQuery?: string
  onSearchQueryChange?: (q: string) => void
  searchResults?: MapCity[]
  onPickCity?: (city: MapCity) => void
}

function CityColumnHeader({
  col,
  monthlyIncome,
  baselineCity = null,
  isBaseline = false,
  onRemove,
  dropdownOpen = false,
  onToggleDropdown,
  onCloseDropdown,
  searchQuery = '',
  onSearchQueryChange,
  searchResults = [],
  onPickCity,
}: CityHeaderProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const mapCity = col?.city ?? (isBaseline ? baselineCity : null)
  const isEmptyBaseline = isBaseline && !mapCity
  const cityLabel = mapCity?.city ?? 'Select current city'
  const headerScored =
    col?.scored ?? (mapCity ? scoreMapCity(mapCity, monthlyIncome) : null)
  const headerScore = headerScored?.displayScore ?? null
  const headerBand = headerScored?.band ?? null
  const headerBandColor = headerScored?.bandColor ?? null

  useEffect(() => {
    if (!dropdownOpen || !isBaseline) return
    const onDocClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        onCloseDropdown?.()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [dropdownOpen, isBaseline, onCloseDropdown])

  return (
    <th
      scope="col"
      className={[
        'wtr-compare-table__col-head',
        isBaseline && 'wtr-compare-table__col-head--baseline',
        onRemove && 'wtr-compare-table__col-head--removable',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {onRemove ? (
        <div className="wtr-compare-table__col-remove-slide">
          <AppChip
            color="danger"
            variant="soft"
            onClick={onRemove}
            aria-label={`Remove ${mapCity?.city ?? 'city'} from comparison`}
          >
            Remove
          </AppChip>
        </div>
      ) : null}

      <div className="wtr-compare-table__col-head-inner">
        {isBaseline ? (
          <div className="wtr-compare-table__col-picker" ref={dropdownRef}>
            <button
              type="button"
              className={[
                'wtr-compare-table__col-city-trigger',
                isEmptyBaseline && 'wtr-compare-table__col-city-trigger--empty',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
              onClick={onToggleDropdown}
            >
              <span className="wtr-compare-table__col-city-trigger-stack">
                <span className="wtr-compare-table__col-city-trigger-text">{cityLabel}</span>
                {isEmptyBaseline ? (
                  <span className="wtr-compare-table__col-city-trigger-sub">to compare with</span>
                ) : null}
              </span>
            </button>
            {dropdownOpen ? (
              <div className="wtr-compare-table__col-picker-panel">
                <input
                  type="text"
                  className="wtr-compare-table__col-picker-input"
                  placeholder="Search your city…"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange?.(e.target.value)}
                  aria-label="Search your current city"
                  autoFocus
                />
                <ul className="wtr-compare-table__col-picker-results" role="listbox">
                  {searchResults.length > 0 ? (
                    searchResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          role="option"
                          className="wtr-compare-table__col-picker-option"
                          onClick={() => onPickCity?.(c)}
                        >
                          <CountryFlag country={c.country} size="s" />
                          {c.city}, {c.country}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="wtr-compare-table__col-picker-hint">
                      {searchQuery.trim().length < 2
                        ? 'Type at least 2 characters'
                        : 'No matching cities'}
                    </li>
                  )}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <span className="wtr-compare-table__col-name">{cityLabel}</span>
        )}

        {!isEmptyBaseline ? (
          <>
            <div className="wtr-compare-table__col-meta">
              <CountryFlag country={mapCity!.country} size="s" className="wtr-compare-table__col-flag" />
              <span className="wtr-compare-table__col-country">{mapCity!.country}</span>
            </div>
            {headerScore != null && headerBand != null && headerBandColor != null ? (
              <WtrAffordabilityScoreBar
                score={headerScore}
                band={headerBand}
                bandColor={headerBandColor}
                className="wtr-compare-table__col-score"
              />
            ) : null}
          </>
        ) : null}
      </div>
    </th>
  )
}

export function WtrComparisonTableView({
  monthlyIncome,
  compareIds,
  baselineCity,
  onBaselineCityChange,
  onBackToMap,
  onClearAll,
  onRemoveCompare,
  toolbarEnd,
}: Props) {
  const [baselineQuery, setBaselineQuery] = useState('')
  const [baselineDropdownOpen, setBaselineDropdownOpen] = useState(false)
  const compareScored = useMemo(
    () => resolveCompareScored(compareIds, monthlyIncome),
    [compareIds, monthlyIncome],
  )
  const { columns, loading } = useWtrComparisonColumns(
    compareScored,
    baselineCity,
    monthlyIncome,
  )

  const baselineResults = useMemo(() => {
    const q = baselineQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return getAllMapCities()
      .filter(
        (c) =>
          c.city.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [baselineQuery])

  const baselineCol = baselineCity
    ? columns.find((c) => c.key === baselineCity.id) ?? null
    : null

  const compareColumns = useMemo(() => {
    return compareScored
      .map((s) => columns.find((c) => c.key === s.city.id))
      .filter((c): c is ComparisonColumnData => c != null)
  }, [columns, compareScored])

  const highlightColumns = useMemo(() => {
    const out: ComparisonColumnData[] = []
    if (baselineCol) out.push(baselineCol)
    out.push(...compareColumns)
    return out
  }, [baselineCol, compareColumns])

  const colCount = 1 + compareColumns.length
  const showEmpty = compareIds.length === 0 && !baselineCity

  const tableWrapRef = useRef<HTMLDivElement>(null)
  const headRowRef = useRef<HTMLTableRowElement>(null)
  const [headStuck, setHeadStuck] = useState(false)

  useEffect(() => {
    const wrap = tableWrapRef.current
    const headRow = headRowRef.current
    if (!wrap || !headRow) return

    const syncHeadHeight = () => {
      wrap.style.setProperty('--wtr-compare-head-h', `${headRow.offsetHeight}px`)
    }

    syncHeadHeight()
    const observer = new ResizeObserver(syncHeadHeight)
    observer.observe(headRow)
    return () => observer.disconnect()
  }, [baselineCity, compareIds.length, compareColumns.length, baselineDropdownOpen])

  useEffect(() => {
    const wrap = tableWrapRef.current
    if (!wrap) return

    const onScroll = () => {
      setHeadStuck(wrap.scrollTop > 0)
    }

    onScroll()
    wrap.addEventListener('scroll', onScroll, { passive: true })
    return () => wrap.removeEventListener('scroll', onScroll)
  }, [showEmpty])

  const toggleBaselineDropdown = useCallback(() => {
    setBaselineDropdownOpen((open) => !open)
  }, [])

  const pickBaselineCity = useCallback(
    (city: MapCity) => {
      onBaselineCityChange(city)
      setBaselineQuery('')
      setBaselineDropdownOpen(false)
    },
    [onBaselineCityChange],
  )

  return (
    <div className="wtr-compare-view">
      <header className="wtr-compare-view__toolbar">
        <button type="button" className="wtr-compare-view__back" onClick={onBackToMap}>
          <IconArrowLeft size={18} stroke={1.5} aria-hidden />
          Back to map
        </button>
        <div className="wtr-compare-view__toolbar-end">
          <button type="button" className="wtr-compare-view__clear-link" onClick={onClearAll}>
            Clear all
          </button>
          {toolbarEnd}
        </div>
      </header>

      {showEmpty ? (
        <div className="wtr-compare-view__empty">
          <p className="wtr-compare-view__empty-text">
            Add cities to compare using the compare button on a city in the list or on a city detail panel
          </p>
        </div>
      ) : (
        <div
          ref={tableWrapRef}
          className={[
            'wtr-compare-table-wrap',
            headStuck ? 'wtr-compare-table-wrap--head-stuck' : null,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <table className="wtr-compare-table">
            <thead>
              <tr ref={headRowRef} className="wtr-compare-table__head-row">
                <th scope="row" className="wtr-compare-table__corner">
                  <span className="wtr-compare-table__corner-label">Data point</span>
                </th>
                <CityColumnHeader
                  col={baselineCol}
                  monthlyIncome={monthlyIncome}
                  baselineCity={baselineCity}
                  isBaseline
                  dropdownOpen={baselineDropdownOpen}
                  onToggleDropdown={toggleBaselineDropdown}
                  onCloseDropdown={() => setBaselineDropdownOpen(false)}
                  searchQuery={baselineQuery}
                  onSearchQueryChange={setBaselineQuery}
                  searchResults={baselineResults}
                  onPickCity={pickBaselineCity}
                />
                {compareColumns.map((col) => (
                  <CityColumnHeader
                    key={col.key}
                    col={col}
                    monthlyIncome={monthlyIncome}
                    onRemove={() => onRemoveCompare(col.key)}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_TABLE_ROWS.map((row, rowIndex) => {
                if (row.kind === 'section') {
                  return (
                    <tr key={row.id} className="wtr-compare-table__section-row">
                      <th
                        scope="rowgroup"
                        className="wtr-compare-table__section-spacer"
                        aria-hidden
                      />
                      <td colSpan={colCount} className="wtr-compare-table__section-head">
                        <span className="wtr-compare-table__section-head-text">{row.label}</span>
                      </td>
                    </tr>
                  )
                }

                const alt = rowIndex % 2 === 0
                return (
                  <tr
                    key={row.id}
                    className={
                      alt
                        ? 'wtr-compare-table__data-row wtr-compare-table__data-row--alt'
                        : 'wtr-compare-table__data-row'
                    }
                  >
                    <th scope="row" className="wtr-compare-table__label-cell">
                      <span className="wtr-compare-table__label">{row.label}</span>
                      {row.sublabel ? (
                        <span className="wtr-compare-table__label-sub">{row.sublabel}</span>
                      ) : null}
                    </th>
                    <td
                      className={[
                        'wtr-compare-table__cell',
                        'wtr-compare-table__cell--baseline',
                        baselineCol
                          ? getComparisonHighlightClass(
                              row,
                              baselineCol.key,
                              highlightColumns,
                              monthlyIncome,
                            )
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {baselineCol ? (
                        loading && (row.id === 'climateType' || row.id === 'climateTemps') ? (
                          <span className="wtr-compare-table__loading">…</span>
                        ) : (
                          <ComparisonCellValue
                            rowId={row.id}
                            col={baselineCol}
                            monthlyIncome={monthlyIncome}
                          />
                        )
                      ) : (
                        <span className="wtr-compare-table__cell-value wtr-compare-table__cell-value--empty">
                          —
                        </span>
                      )}
                    </td>
                    {compareColumns.map((col) => {
                      const highlight = getComparisonHighlightClass(
                        row,
                        col.key,
                        highlightColumns,
                        monthlyIncome,
                      )
                      return (
                        <td
                          key={`${row.id}-${col.key}`}
                          className={['wtr-compare-table__cell', highlight]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {loading && (row.id === 'climateType' || row.id === 'climateTemps') ? (
                            <span className="wtr-compare-table__loading">…</span>
                          ) : (
                            <ComparisonCellValue
                              rowId={row.id}
                              col={col}
                              monthlyIncome={monthlyIncome}
                            />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
