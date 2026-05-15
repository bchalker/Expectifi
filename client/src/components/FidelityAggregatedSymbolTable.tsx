import { IconCirclePlus } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import type { AggregatedFidelitySymbolRow, FidelityPositionRow } from '../lib/fidelityCsv'
import { normalizeFidelityImportSymbol } from '../lib/fidelityCsv'
import { formatFidelityDescription } from '../lib/fidelityDisplay'
import { truncateForHoldingsTable } from '../lib/fidelityHoldingDisplay'
import {
  inferCommonScenarioChoiceForModels,
  scenarioColumnShortLabel,
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import {
  blendedRateForDashboardPositionId,
  computeMergedDashboardPositionModels,
  mergedDashboardModelsForTickerKeys,
  tickerKeySetFromFidelityRows,
} from '../lib/mergedDashboardPositionModels'
import type { PositionReturnModel } from '../lib/positionReturnModel'
import { fmt } from '../utils/format'
import { FidelityValueHoverPortal } from './FidelityValueHoverPortal'
import { Tooltip } from './Tooltip'
import './FidelityHoldingScenarioPopout.scss'

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
  /** Full merged import rows (for return model ids and value-hover source lines). */
  fidelityAllRows: FidelityPositionRow[]
  /** Dashboard only: enables Scenario column + slide panel (parent hosts panel). */
  scenarioBundle?: FidelityAggregatedScenarioBundle | null
  /** Which ticker’s scenario sheet is open (symbol display key, matches row `symbol`). */
  activeScenarioSymbol?: string | null
  onScenarioOpen?: (payload: { symbol: string; contributingRows: FidelityPositionRow[] }) => void
}

function scenarioTriggerChoiceClass(choice: ScenarioUiChoice | typeof SCENARIO_MIXED): string {
  if (choice === 'default' || choice === SCENARIO_MIXED) return ''
  if (choice === 'base') return 'fidelity-agg-scenario-trigger--normal'
  return `fidelity-agg-scenario-trigger--${choice}`
}

function placementForHover(rect: DOMRect): 'above' | 'below' {
  const spaceBelow = window.innerHeight - rect.bottom
  return spaceBelow >= 100 ? 'below' : 'above'
}

function modelsForAggregateRow(
  row: AggregatedFidelitySymbolRow,
  merged: PositionReturnModel[],
): PositionReturnModel[] {
  const keys = tickerKeySetFromFidelityRows(row.contributingRows)
  return mergedDashboardModelsForTickerKeys(merged, keys)
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
  if (!rows.length) return null

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

  const [valueHover, setValueHover] = useState<{
    key: string
    rect: DOMRect
    placement: 'above' | 'below'
  } | null>(null)
  const valueLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const valueHoverLock = useRef(false)

  const clearValueLeaveTimer = () => {
    if (valueLeaveTimer.current) {
      clearTimeout(valueLeaveTimer.current)
      valueLeaveTimer.current = null
    }
  }

  const scheduleValueClose = useCallback(() => {
    clearValueLeaveTimer()
    valueLeaveTimer.current = setTimeout(() => {
      if (!valueHoverLock.current) setValueHover(null)
    }, 140)
  }, [])

  useEffect(() => () => clearValueLeaveTimer(), [])

  const activeValueRow = valueHover ? rows.find((r) => r.symbol === valueHover.key) : null

  return (
    <div className="fidelity-acct-positions fidelity-agg-symbol-table">
      {combinedLines ? (
        <p className="footnote fidelity-agg-symbol-table__note">
          Same ticker across accounts in this bucket is shown as one line (values and cost basis summed).
        </p>
      ) : null}
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th className="fidelity-th-upper">Description</th>
            <th style={{ textAlign: 'right' }}>Value</th>
            <th className="fidelity-th-upper" style={{ textAlign: 'right' }}>
              Cost basis
            </th>
            {scenarioBundle ? (
              <th className="fidelity-th-upper fidelity-agg-scenario-th">Scenario</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
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
            const showAccent = scenarioBundle && common !== 'default'
            const rowKey = r.symbol
            const rowActive =
              activeScenarioSymbol != null &&
              normalizeFidelityImportSymbol(activeScenarioSymbol).toUpperCase() ===
                normalizeFidelityImportSymbol(rowKey).toUpperCase()
            return (
              <tr
                key={rowKey}
                className={rowActive ? 'fidelity-agg-symbol-row--scenario-active' : undefined}
              >
                <td className="sym">{r.symbol}</td>
                <td className="fidelity-desc-cell fidelity-desc-cell--trunc">
                  {showTip ? (
                    <Tooltip content={fullDesc} placement="top">
                      <span>{shortDesc}</span>
                    </Tooltip>
                  ) : (
                    <span title={fullDesc}>{shortDesc}</span>
                  )}
                </td>
                <td className="val" style={{ textAlign: 'right' }}>
                  <span
                    className="fidelity-agg-value-trigger"
                    onMouseEnter={(e) => {
                      clearValueLeaveTimer()
                      valueHoverLock.current = false
                      const rect = e.currentTarget.getBoundingClientRect()
                      setValueHover({ key: rowKey, rect, placement: placementForHover(rect) })
                    }}
                    onMouseLeave={() => {
                      scheduleValueClose()
                    }}
                  >
                    {fmt(r.currentValue)}
                  </span>
                </td>
                <td className="val" style={{ textAlign: 'right' }}>
                  {r.costBasis != null ? fmt(r.costBasis) : '—'}
                </td>
                {scenarioBundle ? (
                  <td className="fidelity-agg-scenario-cell val">
                    <button
                      type="button"
                      className={[
                        'fidelity-agg-scenario-trigger',
                        showAccent ? scenarioTriggerChoiceClass(common) : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-fidelity-scenario-trigger
                      aria-expanded={rowActive}
                      aria-haspopup="dialog"
                      onClick={() => onScenarioOpen?.({ symbol: r.symbol, contributingRows: r.contributingRows })}
                    >
                      <span>{label}</span>
                      <span className="fidelity-agg-scenario-plus" aria-hidden>
                        <IconCirclePlus size={13} stroke={1.5} />
                      </span>
                    </button>
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
      <FidelityValueHoverPortal
        open={Boolean(valueHover && activeValueRow && valueHover.key === activeValueRow.symbol)}
        rect={valueHover?.rect ?? null}
        placement={valueHover?.placement ?? 'below'}
        source={activeValueRow ?? rows[0]!}
        onMouseEnterPopout={() => {
          valueHoverLock.current = true
          clearValueLeaveTimer()
        }}
        onMouseLeavePopout={() => {
          valueHoverLock.current = false
          scheduleValueClose()
        }}
      />
    </div>
  )
}
