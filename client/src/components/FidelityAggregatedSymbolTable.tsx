import { IconArrowNarrowRightDashed } from '@tabler/icons-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import type { AggregatedFidelitySymbolRow, FidelityPositionRow } from '../lib/fidelityCsv'
import {
  aggregateRowHasAccountBreakdown,
  breakdownAggregateByAccount,
  normalizeFidelityImportSymbol,
} from '../lib/fidelityCsv'
import { formatFidelityDescription } from '../lib/fidelityDisplay'
import { truncateForHoldingsTable } from '../lib/fidelityHoldingDisplay'
import {
  inferCommonScenarioChoiceForModels,
  scenarioColumnShortLabel,
  SCENARIO_MIXED,
} from '../lib/holdingScenarioApply'
import {
  blendedRateForDashboardPositionId,
  computeMergedDashboardPositionModels,
  mergedDashboardModelsForTickerKeys,
  tickerKeySetFromFidelityRows,
} from '../lib/mergedDashboardPositionModels'
import type { PositionReturnModel } from '../lib/positionReturnModel'
import { fmt } from '../utils/format'
import { HoldingsSymbolCard } from './HoldingsSymbolCard'
import { Tooltip } from './Tooltip'
import './FidelityAggregatedSymbolTable.scss'

/** Phone / narrow portrait tablet — stacked card layout below this width. */
const HOLDINGS_MOBILE_MQ = '(max-width: 620px)'

function useHoldingsMobileLayout(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(HOLDINGS_MOBILE_MQ).matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(HOLDINGS_MOBILE_MQ)
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}

export type FidelityAggregatedScenarioBundle = {
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  yearsToRetirement: number
  retirementCalendarYear: number
  retRate: number
  brkRate: number
}

type Props = {
  rows: AggregatedFidelitySymbolRow[]
  /** When true, same ticker appeared on more than one import line (e.g. multiple accounts). */
  combinedLines: boolean
  /** Full merged import rows (for return model ids). */
  fidelityAllRows: FidelityPositionRow[]
  /** Dashboard only: enables Scenario column + slide panel (parent hosts panel). */
  scenarioBundle?: FidelityAggregatedScenarioBundle | null
  /** Which ticker’s scenario sheet is open (symbol display key, matches row `symbol`). */
  activeScenarioSymbol?: string | null
  onScenarioOpen?: (payload: { symbol: string; contributingRows: FidelityPositionRow[] }) => void
}

function modelsForAggregateRow(
  row: AggregatedFidelitySymbolRow,
  merged: PositionReturnModel[],
): PositionReturnModel[] {
  const keys = tickerKeySetFromFidelityRows(row.contributingRows)
  return mergedDashboardModelsForTickerKeys(merged, keys)
}

type HoldingGroupProps = {
  row: AggregatedFidelitySymbolRow
  scenarioBundle?: FidelityAggregatedScenarioBundle | null
  mergedModels: PositionReturnModel[]
  h: number
  activeScenarioSymbol?: string | null
  onScenarioOpen?: (payload: { symbol: string; contributingRows: FidelityPositionRow[] }) => void
  showMergedTickerNote: boolean
}

function FidelityAggregatedHoldingGroup({
  row: r,
  scenarioBundle,
  mergedModels,
  h,
  activeScenarioSymbol,
  onScenarioOpen,
  showMergedTickerNote,
}: HoldingGroupProps) {
  const hasBreakdown = aggregateRowHasAccountBreakdown(r)
  const breakdown = useMemo(
    () => (hasBreakdown ? breakdownAggregateByAccount(r) : []),
    [hasBreakdown, r],
  )
  const fullDesc = formatFidelityDescription(r.description)
  const shortDesc = truncateForHoldingsTable(fullDesc)
  const showTip = fullDesc.length > shortDesc.length
  const models = scenarioBundle ? modelsForAggregateRow(r, mergedModels) : []
  const common =
    scenarioBundle && models.length
      ? inferCommonScenarioChoiceForModels(models, h, (m) =>
          blendedRateForDashboardPositionId(m.id, scenarioBundle.retRate, scenarioBundle.brkRate),
        )
      : SCENARIO_MIXED
  const customDec = models.length && common === 'custom' ? models[0]?.flatRate : undefined
  const label = scenarioBundle ? scenarioColumnShortLabel(common, customDec) : '—'
  const rowKey = r.symbol
  const rowActive =
    activeScenarioSymbol != null &&
    normalizeFidelityImportSymbol(activeScenarioSymbol).toUpperCase() ===
      normalizeFidelityImportSymbol(rowKey).toUpperCase()

  const openScenario = () =>
    onScenarioOpen?.({ symbol: r.symbol, contributingRows: r.contributingRows })

  const descNode = showTip ? (
    <Tooltip content={fullDesc} placement="top">
      <span className="holdings-symbol-card__desc holdings-symbol-card__desc--trunc">{shortDesc}</span>
    </Tooltip>
  ) : (
    <span className="holdings-symbol-card__desc holdings-symbol-card__desc--trunc" title={fullDesc}>
      {shortDesc}
    </span>
  )

  const scenarioProps = scenarioBundle
    ? {
        label,
        showAccent: common !== 'default',
        common,
        rowActive,
        onOpen: openScenario,
      }
    : null

  const breakdownBlock =
    hasBreakdown ? (
      <Fragment>
        {showMergedTickerNote ? (
          <p className="holdings-symbol-card__breakdown-note">Same ticker in:</p>
        ) : null}
        <div className="holdings-breakdown-block">
          {breakdown.map((line) => (
            <div key={`${rowKey}-${line.accountKey}`} className="holdings-breakdown-row">
              <div className="holdings-breakdown-row__inner">
                <div className="holdings-breakdown-row__account-cell">
                  <span className="holdings-breakdown-row__source" aria-hidden>
                    <IconArrowNarrowRightDashed size={12} stroke={1.15} />
                  </span>
                  <span className="holdings-breakdown-row__account">{line.accountLabel}</span>
                </div>
                <span className="holdings-breakdown-row__value">{fmt(line.currentValue)}</span>
              </div>
            </div>
          ))}
        </div>
      </Fragment>
    ) : null

  return (
    <div className="holdings-symbol-group">
      <HoldingsSymbolCard
        scenarioActive={rowActive}
        symbol={r.symbol}
        description={descNode}
        currentValue={r.currentValue}
        costBasis={r.costBasis}
        scenario={scenarioProps}
        breakdown={breakdownBlock}
      />
    </div>
  )
}

/** Single table: one row per symbol (totals across accounts in the parent tax bucket). */
export function FidelityAggregatedSymbolTable({
  rows,
  combinedLines,
  fidelityAllRows,
  scenarioBundle,
  activeScenarioSymbol,
  onScenarioOpen,
}: Props) {
  const mobileLayout = useHoldingsMobileLayout()

  const mergedModels = useMemo(() => {
    if (!scenarioBundle) return [] as PositionReturnModel[]
    return computeMergedDashboardPositionModels(
      scenarioBundle.inputs,
      fidelityAllRows,
      scenarioBundle.yearsToRetirement,
      scenarioBundle.retirementCalendarYear,
    )
  }, [scenarioBundle, fidelityAllRows])

  const h = scenarioBundle ? Math.max(1, Math.min(50, Math.round(scenarioBundle.yearsToRetirement))) : 7

  const showCombinedNote = combinedLines || rows.some((r) => aggregateRowHasAccountBreakdown(r))

  if (!rows.length) return null

  return (
    <div
      className={[
        'holdings-positions-table',
        'holdings-symbol-table',
        mobileLayout && 'holdings-symbol-table--mobile-cards',
        !scenarioBundle && 'holdings-symbol-table--no-scenario',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="holdings-symbol-list" role="table" aria-label="Holdings by symbol">
        <div className="holdings-symbol-list__header-row" role="row">
          <span className="holdings-symbol-list__col" role="columnheader">
            Symbol
          </span>
          <span className="holdings-symbol-list__col holdings-symbol-list__col--upper" role="columnheader">
            Description
          </span>
          <span
            className="holdings-symbol-list__col holdings-symbol-list__col--value"
            role="columnheader"
          >
            Value
          </span>
          <span
            className="holdings-symbol-list__col holdings-symbol-list__col--basis holdings-symbol-list__col--upper"
            role="columnheader"
          >
            Cost basis
          </span>
          {scenarioBundle ? (
            <span
              className="holdings-symbol-list__col holdings-symbol-list__col--scenario holdings-symbol-list__col--upper"
              role="columnheader"
            >
              Scenario
            </span>
          ) : null}
        </div>
        {rows.map((r) => (
          <FidelityAggregatedHoldingGroup
            key={r.symbol}
            row={r}
            scenarioBundle={scenarioBundle}
            mergedModels={mergedModels}
            h={h}
            activeScenarioSymbol={activeScenarioSymbol}
            onScenarioOpen={onScenarioOpen}
            showMergedTickerNote={showCombinedNote}
          />
        ))}
      </div>
    </div>
  )
}