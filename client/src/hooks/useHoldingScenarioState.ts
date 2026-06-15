import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import { isMoneyMarketImportRow, normalizeImportSymbol, type ImportedPositionRow } from '../lib/positionsCsv'
import {
  applyScenarioUiChoice,
  horizonClamp,
  inferCommonScenarioChoiceForModels,
  inferScenarioUiChoice,
  isOutlookScenarioChoice,
  mergePatchPositionModelsIntoInputs,
  SCENARIO_MIXED,
  type OutlookScenarioChoice,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import {
  blendedRateForDashboardPositionId,
  computeMergedDashboardPositionModels,
  countImportedLinesMatchingTickerKeys,
  mergedDashboardModelsForTickerKeys,
  tickerKeySetFromImportedRows,
} from '../lib/mergedDashboardPositionModels'
import {
  decimalToPct,
  padYearlyReturns,
  ratesMatchScenario,
  type PositionReturnModel,
} from '../lib/positionReturnModel'
import { parseScenarioPct } from '../components/HoldingScenarioPopout'
import type { ScenarioIntentTabId } from '../components/HoldingScenarioIntentTabs'

function showScenarioOverrideYears(m: PositionReturnModel, horizon: number): boolean {
  const h = horizonClamp(horizon)
  return (
    m.returnMode === 'scenario' &&
    m.scenario != null &&
    !ratesMatchScenario(m.scenario, padYearlyReturns(m.yearlyReturns, h, m.flatRate), h)
  )
}

function clampPct(n: number): number {
  return Math.max(-100, Math.min(100, Math.round(n * 10) / 10))
}

function intentFromScenarioChoice(choice: ScenarioUiChoice): ScenarioIntentTabId {
  if (choice === 'peryear') return 'peryear'
  if (choice === 'custom') return 'custom'
  return 'outlook'
}

export type UseHoldingScenarioStateArgs = {
  contributingRows: ImportedPositionRow[]
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  importedPositionRows: ImportedPositionRow[]
  yearsToRetirement: number
  retirementCalendarYear: number
  retRate: number
  brkRate: number
  initialTab?: ScenarioIntentTabId
}

export function useHoldingScenarioState({
  contributingRows,
  inputs,
  setInputs,
  importedPositionRows,
  yearsToRetirement,
  retirementCalendarYear,
  retRate,
  brkRate,
  initialTab,
}: UseHoldingScenarioStateArgs) {
  const h = horizonClamp(yearsToRetirement)
  const calY = retirementCalendarYear

  const merged = useMemo(
    () => computeMergedDashboardPositionModels(inputs, importedPositionRows, yearsToRetirement, retirementCalendarYear),
    [inputs, importedPositionRows, yearsToRetirement, retirementCalendarYear],
  )

  const symbolKeys = useMemo(() => tickerKeySetFromImportedRows(contributingRows), [contributingRows])

  const scenarioTickerLabel = useMemo(() => {
    const keys = [...symbolKeys].filter(Boolean).sort((a, b) => a.localeCompare(b))
    if (keys.length === 1) return keys[0]!
    if (keys.length > 1) return keys.join(', ')
    const row = contributingRows[0]
    return row ? normalizeImportSymbol(row.symbol).toUpperCase() : ''
  }, [symbolKeys, contributingRows])

  const showMoneyMarketNotice = useMemo(
    () => contributingRows.some(isMoneyMarketImportRow),
    [contributingRows],
  )

  const targets = useMemo(() => {
    const list = mergedDashboardModelsForTickerKeys(merged, symbolKeys)
    return [...list].sort((a, b) => a.id.localeCompare(b.id))
  }, [merged, symbolKeys])

  const importLineCountForSymbol = useMemo(
    () => countImportedLinesMatchingTickerKeys(importedPositionRows, symbolKeys),
    [importedPositionRows, symbolKeys],
  )

  const commonChoice = useMemo(
    () =>
      targets.length
        ? inferCommonScenarioChoiceForModels(targets, h, (m) => blendedRateForDashboardPositionId(m.id, retRate, brkRate))
        : SCENARIO_MIXED,
    [targets, h, retRate, brkRate],
  )

  const resolvedChoice = commonChoice === SCENARIO_MIXED ? 'default' : commonChoice

  const [draftPct, setDraftPct] = useState(() => {
    const first = targets[0]
    if (first) {
      const pmBlend = blendedRateForDashboardPositionId(first.id, retRate, brkRate)
      const ch = inferScenarioUiChoice(first, pmBlend, h)
      if (ch === 'custom') return String(decimalToPct(first.flatRate))
      return String(decimalToPct(pmBlend))
    }
    return String(decimalToPct(retRate))
  })
  const [uiChoice, setUiChoice] = useState<ScenarioUiChoice>('default')
  const [activeTab, setActiveTab] = useState<ScenarioIntentTabId>('outlook')

  useEffect(() => {
    setUiChoice(resolvedChoice)
    setActiveTab(intentFromScenarioChoice(resolvedChoice))
  }, [resolvedChoice, scenarioTickerLabel])

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab)
  }, [initialTab, scenarioTickerLabel])

  useEffect(() => {
    const first = targets[0]
    if (!first) return
    const blended = blendedRateForDashboardPositionId(first.id, retRate, brkRate)
    const ch = inferScenarioUiChoice(first, blended, h)
    if (ch === 'custom') {
      setDraftPct(String(decimalToPct(first.flatRate)))
    }
  }, [targets, h, retRate, brkRate])

  const patchAll = useCallback(
    (choice: ScenarioUiChoice, customPct: number, yearly?: number[]) => {
      if (!targets.length) return
      const patched = targets.map((m) =>
        applyScenarioUiChoice(m, choice, blendedRateForDashboardPositionId(m.id, retRate, brkRate), h, customPct, yearly),
      )
      setInputs({ positionReturnModels: mergePatchPositionModelsIntoInputs(inputs, patched) })
    },
    [h, inputs, retRate, brkRate, setInputs, targets],
  )

  const primaryModel = targets[0]

  const clearToGlobalRate = useCallback(() => {
    setUiChoice('default')
    patchAll('default', 0)
  }, [patchAll])

  const onSelectOutlookTile = useCallback(
    (choice: OutlookScenarioChoice) => {
      setUiChoice(choice)
      patchAll(choice, 0)
    },
    [patchAll],
  )

  const onTabChange = useCallback(
    (tab: ScenarioIntentTabId) => {
      setActiveTab(tab)
      if (tab === 'outlook') {
        return
      }
      if (tab === 'custom') {
        setUiChoice('custom')
        patchAll('custom', parseScenarioPct(draftPct))
      } else if (tab === 'peryear') {
        setUiChoice('peryear')
        patchAll('peryear', 0)
      }
    },
    [draftPct, patchAll],
  )

  const patchYearRates = useCallback(
    (nextRates: number[]) => {
      if (!targets.length) return
      const patched = targets.map((m) => {
        const blended = blendedRateForDashboardPositionId(m.id, retRate, brkRate)
        const padded = padYearlyReturns(nextRates, h, blended)
        return applyScenarioUiChoice(m, 'peryear', blended, h, 0, padded)
      })
      setInputs({ positionReturnModels: mergePatchPositionModelsIntoInputs(inputs, patched) })
    },
    [h, inputs, retRate, brkRate, setInputs, targets],
  )

  const globalBlended = targets[0]
    ? blendedRateForDashboardPositionId(targets[0].id, retRate, brkRate)
    : retRate

  const outlookSelection = isOutlookScenarioChoice(uiChoice) ? uiChoice : null

  const showPerYearGrid =
    primaryModel &&
    activeTab === 'peryear' &&
    (uiChoice === 'peryear' || showScenarioOverrideYears(primaryModel, h))

  return {
    h,
    calY,
    yearsToRetirement,
    scenarioTickerLabel,
    showMoneyMarketNotice,
    importLineCountForSymbol,
    resolvedChoice,
    activeTab,
    onTabChange,
    outlookSelection,
    onSelectOutlookTile,
    draftPct,
    setDraftPct,
    patchAll,
    clampPct,
    parseScenarioPct,
    patchYearRates,
    primaryModel,
    showPerYearGrid,
    globalBlended,
    clearToGlobalRate,
  }
}
