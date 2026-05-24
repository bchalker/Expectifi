import { fmtMon } from '../../utils/format'
import { useMemo, useState } from 'react'
import {
  calcFit,
  calcFitScore,
} from '../../lib/retirementFormulas'
import { DEFAULT_HEALTH_INS_MONTHLY_USD } from '../../lib/whereToRetire/mapIncomeFit'
import {
  countryMatchesFitRegion,
  FIT_REGION_OPTIONS,
  type FitRegionFilter,
} from '../../lib/retirementDestinationRegions'
import {
  cityRecordId,
  getRetirementDestinationCities,
  retirementDestinationsDisclaimer,
} from '../../lib/retirementDestinations'
import { RetirementFitCityCard } from './RetirementFitCityCard'
import './RetirementFitCalculator.scss'

export type FitSortBy = 'surplus' | 'col' | 'tax' | 'qol'

const INITIAL_VISIBLE = 20
const SHOW_MORE_STEP = 20

const SORT_OPTIONS: { id: FitSortBy; label: string }[] = [
  { id: 'surplus', label: 'Real surplus' },
  { id: 'col', label: 'Cost of living' },
  { id: 'tax', label: 'Tax rate' },
  { id: 'qol', label: 'Quality of life' },
]

type RankedCity = {
  city: ReturnType<typeof getRetirementDestinationCities>[number]
  fitScore: number
  surplus: number
  trueCOL: number
  taxRate: number
  qolIndex: number
}

type Props = {
  grossMonthly: number
  className?: string
}

export function RetirementFitCalculator({ grossMonthly, className }: Props) {
  const [includeHealthIns, setIncludeHealthIns] = useState(true)
  const healthInsMonthlyUsd = DEFAULT_HEALTH_INS_MONTHLY_USD
  const [visaOnly, setVisaOnly] = useState(false)
  const [sortBy, setSortBy] = useState<FitSortBy>('surplus')
  const [regions, setRegions] = useState<ReadonlySet<FitRegionFilter>>(
    () => new Set(FIT_REGION_OPTIONS.map((r) => r.id)),
  )
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)

  const allCities = useMemo(() => getRetirementDestinationCities(), [])

  const ranked = useMemo(() => {
    const regionSet = regions
    const rows: RankedCity[] = []

    for (const city of allCities) {
      if (!countryMatchesFitRegion(city.country, regionSet)) continue
      const fit = calcFit(city, grossMonthly, includeHealthIns, healthInsMonthlyUsd)
      if (visaOnly && !fit.visaQualifies) continue

      rows.push({
        city,
        fitScore: calcFitScore(city, grossMonthly, includeHealthIns),
        surplus: fit.surplus,
        trueCOL: fit.trueCOL,
        taxRate: fit.taxRate,
        qolIndex: city.quality_of_life.index ?? 0,
      })
    }

    rows.sort((a, b) => {
      switch (sortBy) {
        case 'col':
          return a.trueCOL - b.trueCOL
        case 'tax':
          return a.taxRate - b.taxRate
        case 'qol':
          return b.qolIndex - a.qolIndex
        case 'surplus':
        default:
          return b.surplus - a.surplus || b.fitScore - a.fitScore
      }
    })

    return rows
  }, [allCities, grossMonthly, includeHealthIns, healthInsMonthlyUsd, visaOnly, regions, sortBy])

  const visible = ranked.slice(0, visibleCount)
  const canShowMore = visibleCount < ranked.length

  const toggleRegion = (id: FitRegionFilter) => {
    setRegions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setVisibleCount(INITIAL_VISIBLE)
  }

  return (
    <div className={['wtr-fit-calc', className].filter(Boolean).join(' ')}>
      <div className="wtr-fit-calc__controls">
        <label className="wtr-fit-calc__toggle">
          <input
            type="checkbox"
            checked={includeHealthIns}
            onChange={(e) => {
              setIncludeHealthIns(e.target.checked)
              setVisibleCount(INITIAL_VISIBLE)
            }}
          />
          <span>Include health insurance est.</span>
        </label>

        <label className="wtr-fit-calc__toggle">
          <input
            type="checkbox"
            checked={visaOnly}
            onChange={(e) => {
              setVisaOnly(e.target.checked)
              setVisibleCount(INITIAL_VISIBLE)
            }}
          />
          <span>Visa-qualifying cities only</span>
        </label>

        <div className="wtr-fit-calc__control-block">
          <span className="wtr-fit-calc__control-label">Sort by</span>
          <div className="wtr-fit-calc__btn-group" role="group" aria-label="Sort by">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={[
                  'wtr-fit-calc__btn',
                  sortBy === opt.id && 'wtr-fit-calc__btn--active',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={sortBy === opt.id}
                onClick={() => {
                  setSortBy(opt.id)
                  setVisibleCount(INITIAL_VISIBLE)
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="wtr-fit-calc__control-block">
          <span className="wtr-fit-calc__control-label">Region</span>
          <div className="wtr-fit-calc__btn-group" role="group" aria-label="Region filter">
            {FIT_REGION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={[
                  'wtr-fit-calc__btn',
                  regions.has(opt.id) && 'wtr-fit-calc__btn--active',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={regions.has(opt.id)}
                onClick={() => toggleRegion(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="wtr-fit-calc__count" aria-live="polite">
        Showing {visible.length} of {ranked.length} cities at {formatIncome(grossMonthly)} gross
      </p>

      <ul className="wtr-fit-calc__list">
        {visible.map((row) => (
          <li key={cityRecordId(row.city)}>
            <RetirementFitCityCard
              city={row.city}
              grossMonthly={grossMonthly}
              includeHealthIns={includeHealthIns}
              healthInsMonthlyUsd={healthInsMonthlyUsd}
              fitScore={row.fitScore}
            />
          </li>
        ))}
      </ul>

      {canShowMore ? (
        <button
          type="button"
          className="wtr-fit-calc__more"
          onClick={() => setVisibleCount((n) => n + SHOW_MORE_STEP)}
        >
          Show more ({ranked.length - visibleCount} remaining)
        </button>
      ) : null}

      <p className="wtr-fit-calc__footnote" role="note">
        {retirementDestinationsDisclaimer()}
      </p>
    </div>
  )
}

function formatIncome(n: number): string {
  return fmtMon(n)
}
