import { useMemo, useState } from 'react'
import { IconPlus, IconX } from '@tabler/icons-react'
import type { ComputedSnapshot, CalculatorInputs } from '../lib/computeResults'
import {
  MAX_RETIRE_REGIONS,
  defaultRetireRegionPick,
  getRetireRegion,
  listRetireRegions,
  type RetireRegionComparison,
  type RetireRegionId,
  type RetireRegionPick,
} from '../lib/calc/retireRegions'
import { fmt, fmtMon } from '../utils/format'
import { InlineSliderRow } from './InlineSliderRow'
import './RetireRegionsBody.scss'

function RegionFlag({ colors }: { colors: readonly string[] }) {
  return (
    <span className="region-flag" aria-hidden>
      {colors.map((bg, i) => (
        <span key={i} style={{ background: bg, border: bg === '#ffffff' ? '1px solid #ddd' : undefined }} />
      ))}
    </span>
  )
}

function ColGuidance({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="retire-regions__col-guide">
      {lines.map((line) => (
        <p key={line} className="retire-regions__col-guide-line">
          {line}
        </p>
      ))}
    </div>
  )
}

function RegionComparisonPanel({
  comparison,
  pick,
  onCostChange,
}: {
  comparison: RetireRegionComparison
  pick: RetireRegionPick
  onCostChange: (cost: number) => void
}) {
  const def = getRetireRegion(pick.regionId)!
  const sur = comparison.surplusMonthlyUsd
  const inflPct = (comparison.annualColInflation * 100).toFixed(1)
  const cost10 = comparison.projectedCostMonthlyUsd(10)

  return (
    <>
      <p className="retire-regions__tax-summary">{comparison.taxSummary}</p>
      <ColGuidance text={comparison.colGuidance} />
      <p className="retire-regions__inflation-note">
        COL inflation assumption: <strong>{inflPct}%</strong>/yr · In 10 years,{' '}
        <span className="retire-regions__tabular">{fmtMon(Math.round(cost10))}</span> at today&apos;s lifestyle
      </p>
      <div className="retire-regions__slider-wrap">
        <InlineSliderRow
          name="Monthly living cost (USD)"
          valueLabel={fmtMon(pick.monthlyCostUsd)}
          min={0}
          max={def.colSliderMax}
          step={100}
          value={pick.monthlyCostUsd}
          onChange={onCostChange}
          tickLeft="$0"
          tickMid={fmt(def.colSliderMax / 2)}
          tickRight={fmt(def.colSliderMax)}
          borderBottomNone
        />
      </div>
      <div className="retire-regions__hero-strip">
        <div>
          <div className="retire-regions__hero-label">Monthly income (gross)</div>
          <div className="retire-regions__hero-val retire-regions__hero-val--gross">{fmtMon(comparison.grossMonthlyUsd)}</div>
        </div>
        <div>
          <div className="retire-regions__hero-label">{comparison.localTaxShortLabel}</div>
          <div className="retire-regions__hero-val retire-regions__hero-val--tax">{fmtMon(comparison.localTaxMonthlyUsd)}</div>
        </div>
        <div>
          <div className="retire-regions__hero-label">After-tax monthly</div>
          <div className="retire-regions__hero-val retire-regions__hero-val--gross">{fmtMon(comparison.afterTaxMonthlyUsd)}</div>
        </div>
      </div>
      <div className="grid-3">
        <div className="card">
          <div className="card-label">Est. living cost</div>
          <div className="card-value">{fmtMon(pick.monthlyCostUsd)}</div>
          <div className="card-sub">monthly (USD)</div>
        </div>
        <div className={`card ${sur >= 0 ? 'accent' : 'warn'}`}>
          <div className="card-label">Monthly surplus / shortfall</div>
          <div className="card-value" style={{ color: sur >= 0 ? 'var(--accent-text)' : 'var(--warn)' }}>
            {(sur >= 0 ? '+' : '') + fmt(sur)}/mo
          </div>
          <div className="card-sub">
            {sur >= 0 ? 'comfortable margin above living costs' : 'shortfall — raise savings or lower spend'}
          </div>
        </div>
        <div className="card">
          <div className="card-label">US federal tax (same income)</div>
          <div className="card-value">{fmtMon(comparison.usTaxMonthlyUsd)}</div>
          <div className="card-sub">for comparison</div>
        </div>
      </div>
    </>
  )
}

type Props = {
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
}

export function RetireRegionsBody({ c, inputs, setInputs }: Props) {
  const picks = inputs.retireRegions
  const [activeId, setActiveId] = useState<RetireRegionId>(() => picks[0]?.regionId ?? 'italy')

  const comparisonById = useMemo(() => {
    const m = new Map<RetireRegionId, RetireRegionComparison>()
    for (const row of c.retireRegionComparisons) {
      m.set(row.regionId, row)
    }
    return m
  }, [c.retireRegionComparisons])

  const activePick = picks.find((p) => p.regionId === activeId) ?? picks[0]
  const activeComparison = activePick ? comparisonById.get(activePick.regionId) : undefined

  const selectedIds = new Set(picks.map((p) => p.regionId))
  const atMaxSelections = picks.length >= MAX_RETIRE_REGIONS

  const availableRegions = useMemo(
    () => listRetireRegions().filter((region) => !picks.some((p) => p.regionId === region.id)),
    [picks],
  )

  const updatePicks = (next: RetireRegionPick[]) => {
    setInputs({ retireRegions: next.slice(0, MAX_RETIRE_REGIONS) })
  }

  const addRegion = (id: RetireRegionId) => {
    if (selectedIds.has(id) || atMaxSelections) return
    const next = [...picks, defaultRetireRegionPick(id)]
    updatePicks(next)
    setActiveId(id)
  }

  const removeRegion = (id: RetireRegionId) => {
    const next = picks.filter((p) => p.regionId !== id)
    if (next.length === 0) {
      updatePicks([defaultRetireRegionPick('italy')])
      setActiveId('italy')
      return
    }
    updatePicks(next)
    if (activeId === id) setActiveId(next[0].regionId)
  }

  const setCost = (id: RetireRegionId, cost: number) => {
    updatePicks(picks.map((p) => (p.regionId === id ? { ...p, monthlyCostUsd: cost } : p)))
  }

  return (
    <>
      <div className="section-title">Where would you like to retire?</div>
      <p className="retire-regions__lead">
        Compare up to {MAX_RETIRE_REGIONS} destinations using cost of living, COL inflation, and a simplified local tax
        model. US federal tax still applies to citizens — adjust each region&apos;s monthly cost to match your lifestyle.
      </p>

      {availableRegions.length > 0 ? (
        <div className="retire-regions__available" role="group" aria-label="Add destinations to compare">
          <span className="retire-regions__available-label">Add a destination</span>
          <div className="retire-regions__chip-grid">
            {availableRegions.map((region) => (
              <button
                key={region.id}
                type="button"
                className={`retire-regions__chip retire-regions__chip--add${atMaxSelections ? ' retire-regions__chip--limit' : ''}`}
                disabled={atMaxSelections}
                aria-disabled={atMaxSelections}
                onClick={() => addRegion(region.id)}
              >
                <RegionFlag colors={region.flagColors} />
                <span>{region.name}</span>
                <IconPlus size={14} stroke={2} className="retire-regions__chip-action" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="retire-regions__counter" aria-live="polite">
        {picks.length} of {MAX_RETIRE_REGIONS} selected
      </p>

      <div className="retire-regions__selected" role="tablist" aria-label="Selected destinations">
        {picks.map((pick) => {
          const def = getRetireRegion(pick.regionId)
          if (!def) return null
          const isActive = pick.regionId === activeId
          return (
            <div key={pick.regionId} className="retire-regions__selected-wrap">
              <button
                type="button"
                role="tab"
                id={`retire-tab-${pick.regionId}`}
                aria-selected={isActive}
                aria-controls={`retire-panel-${pick.regionId}`}
                tabIndex={isActive ? 0 : -1}
                className={`retire-regions__chip retire-regions__chip--selected${isActive ? ' retire-regions__chip--active' : ''}`}
                onClick={() => setActiveId(pick.regionId)}
              >
                <RegionFlag colors={def.flagColors} />
                <span>{def.name}</span>
              </button>
              <button
                type="button"
                className="retire-regions__chip-remove"
                aria-label={`Remove ${def.name}`}
                onClick={() => removeRegion(pick.regionId)}
              >
                <IconX size={14} stroke={2} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>

      {activePick && activeComparison ? (
        <div
          role="tabpanel"
          id={`retire-panel-${activePick.regionId}`}
          aria-labelledby={`retire-tab-${activePick.regionId}`}
          className="retire-regions__panel"
        >
          <RegionComparisonPanel
            comparison={activeComparison}
            pick={activePick}
            onCostChange={(cost) => setCost(activePick.regionId, cost)}
          />
        </div>
      ) : null}

      <div className="footnote">
        Tax and COL figures are educational placeholders — not tax, legal, or immigration advice. Consult a cross-border
        specialist before relocating.
      </div>
    </>
  )
}
