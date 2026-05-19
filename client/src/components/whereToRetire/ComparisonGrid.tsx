import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import { getCatalogEntry, type DestinationCatalogEntry } from '../../data/destinations'
import { US_FEDERAL_NOTE } from '../../data/retirementTaxDetail'
import { loadProfileForKey, type DestinationProfile } from '../../lib/whereToRetire/profiles'
import { loadDestinationMonthlyCost, saveDestinationMonthlyCost } from '../../lib/whereToRetire/storage'
import { fmtMon, fmtSignedMonthly } from '../../utils/format'
import { DestinationMark } from './DestinationMark'
import { DollarStrengthSparkline } from './DollarStrengthSparkline'
import { ColSnapshotOverlay, type ColOverlayTarget } from './ColSnapshotOverlay'
import { CostOfLivingIndexCell } from './CostOfLivingIndexCell'
import { TaxRateCell } from './TaxRateCell'
import './ComparisonGrid.scss'

const SURPLUS_ROW = {
  label: 'Monthly surplus / shortfall',
  shortLabel: 'Surplus',
} as const

/** Temporarily hidden grid rows — remove ids to restore. */
const TEMP_HIDDEN_GRID_ROW_IDS = new Set(['qol'])

const ALL_GRID_ROWS: { id: string; label: string; shortLabel: string; sublabel?: string }[] = [
  { id: 'afterTax', label: 'After-tax monthly income', shortLabel: 'After tax' },
  { id: 'livingCost', label: 'Estimated living cost', shortLabel: 'Living cost' },
  {
    id: 'taxRate',
    label: 'Tax rate on retirement income',
    shortLabel: 'Tax rate',
    sublabel: US_FEDERAL_NOTE,
  },
  { id: 'exemptions', label: 'Key retirement income exemptions', shortLabel: 'Exemptions' },
  { id: 'visa', label: 'Visa / residency requirement', shortLabel: 'Visa' },
  { id: 'healthcare', label: 'Healthcare notes', shortLabel: 'Healthcare' },
  { id: 'col', label: 'Cost of living index', shortLabel: 'COL' },
  { id: 'qol', label: 'Quality of life score', shortLabel: 'QoL' },
  { id: 'fx', label: 'Dollar vs local currency', shortLabel: 'Currency' },
  { id: 'topReason', label: 'Top reason this destination ranked', shortLabel: 'Top reason' },
  { id: 'resources', label: 'Resources and links', shortLabel: 'Links' },
]

const ROWS = ALL_GRID_ROWS.filter((row) => !TEMP_HIDDEN_GRID_ROW_IDS.has(row.id))

const CENTER_VALUE_ROW_IDS = new Set(
  ['col', 'qol', 'fx'].filter((id) => !TEMP_HIDDEN_GRID_ROW_IDS.has(id)),
)

type ColumnState = {
  entry: DestinationCatalogEntry
  monthlyCost: number
  profile: DestinationProfile | null
  loading: boolean
  error: boolean
}

export type DestinationScoreMeta = {
  topReason: string
}

type Props = {
  selectedKeys: string[]
  grossMonthlyIncome: number
  scoreByKey: Record<string, DestinationScoreMeta>
  onRemove: (key: string) => void
}

function SurplusBar({ surplus, income }: { surplus: number; income: number }) {
  const pct = income > 0 ? Math.min(100, Math.max(0, (surplus / income) * 100)) : 0
  return (
    <div className="wtr-grid__surplus-bar" aria-hidden>
      <div className="wtr-grid__surplus-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}


function CellContent({
  rowId,
  col,
  scoreMeta,
  onCostChange,
  onColOpen,
}: {
  rowId: string
  col: ColumnState
  scoreMeta?: DestinationScoreMeta
  onCostChange: (cost: number) => void
  onColOpen: (entry: ColumnState['entry']) => void
}) {
  const p = col.profile
  if (col.loading) return <span className="wtr-grid__loading">Loading…</span>
  if (col.error || !p) return <span className="wtr-grid__muted">—</span>

  switch (rowId) {
    case 'afterTax':
      return (
        <div className="wtr-grid__metric-stack">
          <span className="wtr-grid__money wtr-grid__money--head">{fmtMon(p.afterTaxMonthly)}</span>
        </div>
      )
    case 'livingCost': {
      const min = Math.max(500, Math.round(col.entry.defaultMonthlyCostUsd * 0.5))
      const max = Math.round(col.entry.defaultMonthlyCostUsd * 2.5)
      return (
        <div className="wtr-grid__metric-stack wtr-grid__cost-edit">
          <span className="wtr-grid__money wtr-grid__money--head">{fmtMon(col.monthlyCost)}</span>
          <input
            type="range"
            className="wtr-grid__cost-slider"
            min={min}
            max={max}
            step={50}
            value={Math.round(col.monthlyCost)}
            onChange={(e) => onCostChange(Number(e.target.value))}
            aria-label={`Monthly living cost for ${col.entry.name}`}
          />
          <p className="wtr-grid__cost-estimate">
            Current estimate:{' '}
            <span className="wtr-grid__cost-estimate-val">{fmtMon(p.estimatedLivingCostUsd)}</span>
          </p>
        </div>
      )
    }
    case 'taxRate':
      return (
        <TaxRateCell
          detail={p.retirementTaxDetail}
          isUsState={col.entry.kind === 'us-state'}
          noStateIncomeTax={col.entry.kind === 'us-state' && col.entry.noIncomeTax}
        />
      )
    case 'exemptions':
      return <p className="wtr-grid__note">{p.exemptionNotes}</p>
    case 'visa':
      return <p className="wtr-grid__note">{p.visaNotes}</p>
    case 'healthcare':
      return <p className="wtr-grid__note">{p.healthcareNotes}</p>
    case 'col':
      return (
        <CostOfLivingIndexCell
          score={p.colIndex}
          source={p.colScoreSource}
          breakdown={p.colBreakdown}
          destinationName={col.entry.name}
          estimatedLivingCostUsd={p.estimatedLivingCostUsd}
          estimatedLivingCostLabel={p.estimatedLivingCostLabel}
          onOpen={() => onColOpen(col.entry)}
        />
      )
    case 'fx':
      if (p.kind === 'us-state' || p.currencyCode === 'USD') {
        return <span className="wtr-grid__note">Uses USD</span>
      }
      return p.dollarStrength ? (
        <DollarStrengthSparkline series={p.dollarStrength} />
      ) : (
        <span className="wtr-grid__muted">—</span>
      )
    case 'topReason':
      return <span>{scoreMeta?.topReason ?? '—'}</span>
    case 'resources':
      return (
        <ul className="wtr-grid__links">
          {p.resources.map((link) => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )
    default:
      return null
  }
}

const MOBILE_METRIC_ROWS = [
  { id: 'surplus', label: SURPLUS_ROW.label },
  ...ROWS.map((r) => ({ id: r.id, label: r.label })),
]

function SurplusCellValue({
  col,
  grossMonthlyIncome,
}: {
  col: ColumnState
  grossMonthlyIncome: number
}) {
  if (col.loading) return <span className="wtr-grid__loading">Loading…</span>
  if (!col.profile) return <span className="wtr-grid__muted">—</span>
  const sur = col.profile.monthlySurplus
  const pos = sur >= 0
  return (
    <div className={`wtr-grid__surplus-cell${pos ? '' : ' wtr-grid__surplus-cell--neg'}`}>
      <div className={`wtr-grid__surplus-num wtr-grid__surplus-num--${pos ? 'pos' : 'neg'}`}>
        {fmtSignedMonthly(sur)}
      </div>
      <SurplusBar surplus={sur} income={grossMonthlyIncome} />
    </div>
  )
}

function DestinationHeadCell({
  col,
  grossMonthlyIncome,
  onRemove,
  className,
}: {
  col: ColumnState
  grossMonthlyIncome: number
  onRemove: (key: string) => void
  className?: string
}) {
  const p = col.profile
  const sur = p?.monthlySurplus ?? 0
  const pos = sur >= 0

  return (
    <div className={['wtr-grid__col-head-inner', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="wtr-grid__remove"
        aria-label={`Remove ${col.entry.name}`}
        onClick={() => onRemove(col.entry.key)}
      >
        <IconX size={14} stroke={2} aria-hidden />
      </button>
      <span className="wtr-grid__col-mark">
        <DestinationMark entry={col.entry} />
      </span>
      <span className="wtr-grid__col-name">{col.entry.name}</span>
      {col.loading ? (
        <span className="wtr-grid__col-hero wtr-grid__col-hero--loading">…</span>
      ) : p ? (
        <div
          className={`wtr-grid__surplus-cell wtr-grid__surplus-cell--head${pos ? '' : ' wtr-grid__surplus-cell--neg'}`}
        >
          <div className={`wtr-grid__surplus-num wtr-grid__surplus-num--${pos ? 'pos' : 'neg'}`}>
            {fmtSignedMonthly(sur)}
          </div>
          <SurplusBar surplus={sur} income={grossMonthlyIncome} />
        </div>
      ) : (
        <span className="wtr-grid__muted">—</span>
      )}
    </div>
  )
}

function ComparisonGridMobile({
  columns,
  grossMonthlyIncome,
  scoreByKey,
  onRemove,
  onCostChange,
  onColOpen,
}: {
  columns: ColumnState[]
  grossMonthlyIncome: number
  scoreByKey: Record<string, DestinationScoreMeta>
  onRemove: (key: string) => void
  onCostChange: (key: string, cost: number) => void
  onColOpen: (entry: DestinationCatalogEntry) => void
}) {
  const [activeKey, setActiveKey] = useState(columns[0]?.entry.key ?? '')

  useEffect(() => {
    if (!columns.length) return
    if (!columns.some((c) => c.entry.key === activeKey)) {
      setActiveKey(columns[0].entry.key)
    }
  }, [activeKey, columns])

  const col = columns.find((c) => c.entry.key === activeKey) ?? columns[0]
  if (!col) return null

  return (
    <div className="wtr-grid__mobile">
      <label className="wtr-grid__mobile-picker">
        <span className="wtr-grid__mobile-picker-label">Compare destination</span>
        <select
          className="wtr-grid__mobile-select"
          value={col.entry.key}
          onChange={(e) => setActiveKey(e.target.value)}
          aria-label="Select destination to compare"
        >
          {columns.map((c) => (
            <option key={c.entry.key} value={c.entry.key}>
              {c.entry.name}
            </option>
          ))}
        </select>
      </label>

      <article className="wtr-grid__mobile-card" aria-labelledby="wtr-mobile-col-head">
        <div className="wtr-grid__mobile-head" id="wtr-mobile-col-head">
          <span className="wtr-grid__mobile-head-mark">
            <DestinationMark entry={col.entry} />
          </span>
          <span className="wtr-grid__mobile-head-name">{col.entry.name}</span>
          <button
            type="button"
            className="wtr-grid__mobile-remove"
            aria-label={`Remove ${col.entry.name}`}
            onClick={() => onRemove(col.entry.key)}
          >
            <IconX size={16} stroke={2} aria-hidden />
          </button>
        </div>

        <dl className="wtr-grid__mobile-rows">
          {MOBILE_METRIC_ROWS.map((row) => (
            <div
              key={row.id}
              className={[
                'wtr-grid__mobile-row',
                row.id === 'taxRate' && 'wtr-grid__mobile-row--tax',
                row.id === 'col' && 'wtr-grid__mobile-row--col',
                CENTER_VALUE_ROW_IDS.has(row.id) && 'wtr-grid__mobile-row--center',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <dt className="wtr-grid__mobile-row-label">
                {row.label}
                {row.id === 'taxRate' ? (
                  <span className="wtr-grid__row-label-sub">{US_FEDERAL_NOTE}</span>
                ) : null}
              </dt>
              <dd className="wtr-grid__mobile-row-value">
                {row.id === 'surplus' ? (
                  <SurplusCellValue col={col} grossMonthlyIncome={grossMonthlyIncome} />
                ) : (
                  <CellContent
                    rowId={row.id}
                    col={col}
                    scoreMeta={scoreByKey[col.entry.key]}
                    onCostChange={(cost) => onCostChange(col.entry.key, cost)}
                    onColOpen={onColOpen}
                  />
                )}
              </dd>
            </div>
          ))}
          <div className="wtr-grid__mobile-row wtr-grid__mobile-row--footer">
            <dt className="wtr-grid__mobile-row-label">Data freshness</dt>
            <dd className="wtr-grid__mobile-row-value wtr-grid__footer">
              {col.profile?.dataFreshnessLabel ?? '—'}
            </dd>
          </div>
        </dl>
      </article>
    </div>
  )
}

export function ComparisonGrid({ selectedKeys, grossMonthlyIncome, scoreByKey, onRemove }: Props) {
  const [costs, setCosts] = useState<Record<string, number>>({})
  const [colOverlay, setColOverlay] = useState<ColOverlayTarget | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [headStuck, setHeadStuck] = useState(false)

  const entries = useMemo(() => {
    const seen = new Set<string>()
    const uniqueKeys = selectedKeys.filter((k) => {
      if (!k || seen.has(k)) return false
      seen.add(k)
      return true
    })
    return uniqueKeys
      .map((k) => getCatalogEntry(k))
      .filter((e): e is DestinationCatalogEntry => e != null)
  }, [selectedKeys])

  const entryKeySig = selectedKeys.join('|')

  const [profiles, setProfiles] = useState<
    Record<string, { profile: DestinationProfile | null; loading: boolean; error: boolean }>
  >({})

  useEffect(() => {
    let cancelled = false
    for (const entry of entries) {
      const cost = costs[entry.key] ?? loadDestinationMonthlyCost(entry)
      setProfiles((prev) => ({
        ...prev,
        [entry.key]: { profile: prev[entry.key]?.profile ?? null, loading: true, error: false },
      }))
      void loadProfileForKey(entry.key, cost, grossMonthlyIncome)
        .then((profile) => {
          if (cancelled) return
          setProfiles((prev) => ({
            ...prev,
            [entry.key]: { profile, loading: false, error: !profile },
          }))
        })
        .catch(() => {
          if (cancelled) return
          setProfiles((prev) => ({
            ...prev,
            [entry.key]: { profile: null, loading: false, error: true },
          }))
        })
    }
    return () => {
      cancelled = true
    }
  }, [entryKeySig, entries, grossMonthlyIncome, costs])

  const columns: ColumnState[] = entries.map((entry) => ({
    entry,
    monthlyCost: costs[entry.key] ?? loadDestinationMonthlyCost(entry),
    profile: profiles[entry.key]?.profile ?? null,
    loading: profiles[entry.key]?.loading ?? true,
    error: profiles[entry.key]?.error ?? false,
  }))

  const updateScrollAffordance = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      setHeadStuck(false)
      return
    }
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(maxScroll > 2 && el.scrollLeft < maxScroll - 2)
    setHeadStuck(el.scrollTop > 1)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollAffordance()
    el.addEventListener('scroll', updateScrollAffordance, { passive: true })
    const ro = new ResizeObserver(updateScrollAffordance)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollAffordance)
      ro.disconnect()
    }
  }, [columns.length, updateScrollAffordance])

  const scrollByColumn = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    const firstCol = el.querySelector<HTMLElement>('th.wtr-grid__data-col, td.wtr-grid__data-col')
    const step = firstCol?.offsetWidth ?? el.clientWidth * 0.85
    el.scrollBy({ left: direction * step, behavior: 'smooth' })
  }, [])

  if (entries.length === 0) {
    return <p className="wtr-grid__empty">Search for a country or US state to start comparing.</p>
  }

  const showNav = columns.length > 1

  const handleCostChange = useCallback((key: string, cost: number) => {
    saveDestinationMonthlyCost(key, cost)
    setCosts((prev) => ({ ...prev, [key]: cost }))
  }, [])

  const handleColOpen = useCallback((entry: DestinationCatalogEntry) => {
    setColOverlay({ entry })
  }, [])

  return (
    <div
      className="wtr-grid"
      role="region"
      aria-label="Destination comparison"
      style={{ '--wtr-col-count': columns.length } as CSSProperties}
    >
      <ColSnapshotOverlay target={colOverlay} onClose={() => setColOverlay(null)} />

      <ComparisonGridMobile
        columns={columns}
        grossMonthlyIncome={grossMonthlyIncome}
        scoreByKey={scoreByKey}
        onRemove={onRemove}
        onCostChange={handleCostChange}
        onColOpen={handleColOpen}
      />

      <div className="wtr-grid__desktop">
      <div
        className={[
          'wtr-grid__frame',
          showNav && 'wtr-grid__frame--has-nav',
          canScrollLeft && 'wtr-grid__frame--fade-left',
          canScrollRight && 'wtr-grid__frame--fade-right',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {showNav ? (
          <>
            <button
              type="button"
              className="wtr-grid__nav-btn wtr-grid__nav-btn--prev"
              aria-label="Scroll to previous destination"
              disabled={!canScrollLeft}
              onClick={() => scrollByColumn(-1)}
            >
              <IconChevronLeft size={20} stroke={1.5} aria-hidden />
            </button>
            <button
              type="button"
              className="wtr-grid__nav-btn wtr-grid__nav-btn--next"
              aria-label="Scroll to next destination"
              disabled={!canScrollRight}
              onClick={() => scrollByColumn(1)}
            >
              <IconChevronRight size={20} stroke={1.5} aria-hidden />
            </button>
          </>
        ) : null}
        <SimpleBar
          className={['wtr-grid__viewport', headStuck && 'wtr-grid__viewport--head-stuck']
            .filter(Boolean)
            .join(' ')}
          autoHide={false}
          scrollableNodeProps={{
            ref: scrollRef,
            tabIndex: 0,
            'aria-label': 'Comparison table — scroll vertically and horizontally',
          }}
        >
          <table className="wtr-grid__table">
            <colgroup>
              <col className="wtr-grid__label-col" />
              {columns.map((col) => (
                <col key={col.entry.key} className="wtr-grid__data-col" />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="wtr-grid__label-col wtr-grid__corner">
                  <span className="wtr-grid__row-label-full">{SURPLUS_ROW.label}</span>
                  <span className="wtr-grid__row-label-short">{SURPLUS_ROW.shortLabel}</span>
                </th>
                {columns.map((col) => (
                  <th
                    key={col.entry.key}
                    scope="col"
                    className="wtr-grid__data-col wtr-grid__head-col"
                    id={`wtr-col-head-${col.entry.key}`}
                  >
                    <DestinationHeadCell
                      col={col}
                      grossMonthlyIncome={grossMonthlyIncome}
                      onRemove={onRemove}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={[
                    rowIndex % 2 === 1 && 'wtr-grid__row--alt',
                    row.id === 'taxRate' && 'wtr-grid__row--tax',
                    row.id === 'col' && 'wtr-grid__row--col',
                    CENTER_VALUE_ROW_IDS.has(row.id) && 'wtr-grid__row--center',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined}
                >
                  <th scope="row" className="wtr-grid__label-col wtr-grid__sticky wtr-grid__row-label">
                    <span className="wtr-grid__row-label-full">{row.label}</span>
                    {row.sublabel ? (
                      <span className="wtr-grid__row-label-sub">{row.sublabel}</span>
                    ) : null}
                    <span className="wtr-grid__row-label-short">{row.shortLabel}</span>
                  </th>
                  {columns.map((col) => (
                    <td
                      key={`${col.entry.key}-${row.id}`}
                      className={[
                        'wtr-grid__data-col',
                        'wtr-grid__cell',
                        row.id === 'col' && 'wtr-grid__cell--col',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      headers={`wtr-col-head-${col.entry.key}`}
                    >
                      <CellContent
                        rowId={row.id}
                        col={col}
                        scoreMeta={scoreByKey[col.entry.key]}
                        onCostChange={(cost) => handleCostChange(col.entry.key, cost)}
                        onColOpen={handleColOpen}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th
                  scope="row"
                  className="wtr-grid__label-col wtr-grid__sticky wtr-grid__row-label wtr-grid__row-label--footer"
                >
                  <span className="wtr-grid__row-label-full">Data freshness</span>
                  <span className="wtr-grid__row-label-short">Fresh</span>
                </th>
                {columns.map((col) => (
                  <td key={`foot-${col.entry.key}`} className="wtr-grid__data-col wtr-grid__footer">
                    {col.profile?.dataFreshnessLabel ?? '—'}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </SimpleBar>
      </div>
      </div>
    </div>
  )
}
