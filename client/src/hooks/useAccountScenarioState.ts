import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  blendedRateForAccountBucket,
  buildAccountReturnScenario,
  currentBalanceForScenarioBucket,
  getAccountReturnScenario,
  inferAccountScenarioUiChoice,
  mergedModelsForAccountBucket,
  patchAccountReturnScenario,
  type AccountReturnScenario,
  type AccountScenarioBucketId,
} from '../lib/accountReturnScenario'
import type { CalculatorInputs } from '../lib/computeResults'
import type { ImportedPositionRow } from '../lib/positionsCsv'
import {
  countHoldingsWithScenarioChoice,
  holdingModelsClearedToDefault,
  scenarioChoiceConflictLabel,
} from '../lib/holdingsScenarioConflict'
import {
  horizonClamp,
  isOutlookScenarioChoice,
  mergePatchPositionModelsIntoInputs,
  OUTLOOK_SCENARIO_TILES,
  type OutlookScenarioChoice,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import { blendedRateForDashboardPositionId, computeMergedDashboardPositionModels } from '../lib/mergedDashboardPositionModels'
import {
  decimalToPct,
  padYearlyReturns,
  ratesMatchScenario,
  type PositionReturnModel,
} from '../lib/positionReturnModel'
import { growthPhaseProjectionYears } from '../lib/marketScenarioProjection'
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

function accountScenarioToPositionModel(scenario: AccountReturnScenario): PositionReturnModel {
  return {
    id: '_account',
    ticker: '',
    label: '',
    currentValue: 0,
    accountId: '',
    yearlyReturns: scenario.yearlyReturns,
    returnMode: scenario.returnMode,
    flatRate: scenario.flatRate,
    scenario: scenario.scenario ?? null,
  }
}

export type UseAccountScenarioStateArgs = {
  bucket: AccountScenarioBucketId
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  importedPositionRows: ImportedPositionRow[]
  yearsToRetirement: number
  retirementCalendarYear: number
  retRate: number
  brkRate: number
  initialTab?: ScenarioIntentTabId
}

export function useAccountScenarioState({
  bucket,
  inputs,
  setInputs,
  importedPositionRows,
  yearsToRetirement,
  retirementCalendarYear,
  retRate,
  brkRate,
  initialTab,
}: UseAccountScenarioStateArgs) {
  const h = horizonClamp(yearsToRetirement)
  const calY = retirementCalendarYear
  const blended = blendedRateForAccountBucket(bucket, retRate, brkRate)

  const perYearCalendarYears = useMemo(
    () => growthPhaseProjectionYears(calY, yearsToRetirement),
    [calY, yearsToRetirement],
  )
  const perYearCount = perYearCalendarYears.length

  const stored = getAccountReturnScenario(inputs, bucket)

  const merged = useMemo(
    () => computeMergedDashboardPositionModels(inputs, importedPositionRows, yearsToRetirement, retirementCalendarYear),
    [inputs, importedPositionRows, yearsToRetirement, retirementCalendarYear],
  )

  const targets = useMemo(() => mergedModelsForAccountBucket(bucket, merged), [bucket, merged])

  const resolvedChoice = stored ? inferAccountScenarioUiChoice(stored, blended, h) : 'default'

  const [draftPct, setDraftPct] = useState(() => {
    if (stored) {
      const ch = inferAccountScenarioUiChoice(stored, blended, h)
      if (ch === 'custom') return String(decimalToPct(stored.flatRate))
    }
    return String(decimalToPct(blended))
  })
  const [uiChoice, setUiChoice] = useState<ScenarioUiChoice>('default')
  const [activeTab, setActiveTab] = useState<ScenarioIntentTabId>('outlook')

  useEffect(() => {
    setUiChoice(resolvedChoice)
    setActiveTab(intentFromScenarioChoice(resolvedChoice))
  }, [resolvedChoice, bucket])

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab)
  }, [initialTab, bucket])

  useEffect(() => {
    if (!stored) return
    const ch = inferAccountScenarioUiChoice(stored, blended, h)
    if (ch === 'custom') {
      setDraftPct(String(decimalToPct(stored.flatRate)))
    }
  }, [stored, blended, h])

  const blendedForModel = useCallback(
    (m: PositionReturnModel) => blendedRateForDashboardPositionId(m.id, retRate, brkRate),
    [retRate, brkRate],
  )

  const [overrideConflict, setOverrideConflict] = useState<{
    choice: ScenarioUiChoice
    count: number
    customPct: number
    yearly?: number[]
  } | null>(null)

  const applyAccountPatch = useCallback(
    (choice: ScenarioUiChoice, customPct: number, yearly?: number[]) => {
      const horizon = choice === 'peryear' ? perYearCount : h
      const next = buildAccountReturnScenario(choice, blended, horizon, customPct, stored, yearly)
      setInputs({ accountReturnScenarios: patchAccountReturnScenario(inputs, bucket, next) })
    },
    [blended, bucket, h, inputs, perYearCount, setInputs, stored],
  )

  const tryPatchAccount = useCallback(
    (choice: ScenarioUiChoice, customPct: number, yearly?: number[]) => {
      if (choice === 'default') {
        applyAccountPatch(choice, customPct, yearly)
        setOverrideConflict(null)
        return
      }
      const count = countHoldingsWithScenarioChoice(targets, choice, blendedForModel, h)
      if (count > 0) {
        setOverrideConflict({ choice, count, customPct, yearly })
        return
      }
      applyAccountPatch(choice, customPct, yearly)
      setOverrideConflict(null)
    },
    [applyAccountPatch, blendedForModel, h, targets],
  )

  const onRemoveOverrides = useCallback(() => {
    if (!overrideConflict) return
    const cleared = holdingModelsClearedToDefault(
      targets,
      overrideConflict.choice,
      blendedForModel,
      h,
    )
    const nextAccount = buildAccountReturnScenario(
      overrideConflict.choice,
      blended,
      overrideConflict.choice === 'peryear' ? perYearCount : h,
      overrideConflict.customPct,
      stored,
      overrideConflict.yearly,
    )
    setInputs({
      ...(cleared.length
        ? { positionReturnModels: mergePatchPositionModelsIntoInputs(inputs, cleared) }
        : {}),
      accountReturnScenarios: patchAccountReturnScenario(inputs, bucket, nextAccount),
    })
    setOverrideConflict(null)
  }, [blended, bucket, blendedForModel, h, inputs, overrideConflict, perYearCount, setInputs, stored, targets])

  const onKeepBothOverrides = useCallback(() => {
    if (!overrideConflict) return
    const nextAccount = buildAccountReturnScenario(
      overrideConflict.choice,
      blended,
      overrideConflict.choice === 'peryear' ? perYearCount : h,
      overrideConflict.customPct,
      stored,
      overrideConflict.yearly,
    )
    setInputs({ accountReturnScenarios: patchAccountReturnScenario(inputs, bucket, nextAccount) })
    setOverrideConflict(null)
  }, [blended, bucket, h, inputs, overrideConflict, perYearCount, setInputs, stored])

  const clearToGlobalRate = useCallback(() => {
    setInputs({ accountReturnScenarios: patchAccountReturnScenario(inputs, bucket, null) })
    setUiChoice('default')
    setOverrideConflict(null)
  }, [bucket, inputs, setInputs])

  const primaryModel = useMemo(
    () => (stored ? accountScenarioToPositionModel(stored) : targets[0]),
    [stored, targets],
  )

  const onSelectOutlookTile = useCallback(
    (choice: OutlookScenarioChoice) => {
      setUiChoice(choice)
      tryPatchAccount(choice, 0)
    },
    [tryPatchAccount],
  )

  const onTabChange = useCallback(
    (tab: ScenarioIntentTabId) => {
      setActiveTab(tab)
      if (tab === 'outlook') {
        return
      }
      if (tab === 'custom') {
        setUiChoice('custom')
        tryPatchAccount('custom', parseScenarioPct(draftPct))
      } else if (tab === 'peryear') {
        setUiChoice('peryear')
        tryPatchAccount('peryear', 0)
      }
    },
    [draftPct, tryPatchAccount],
  )

  const patchYearRates = useCallback(
    (nextRates: number[]) => {
      const padded = padYearlyReturns(nextRates, perYearCount, blended)
      tryPatchAccount('peryear', 0, padded)
    },
    [blended, perYearCount, tryPatchAccount],
  )

  const globalPct = (blended * 100).toFixed(1)

  const holdingsPreviewValue = useMemo(
    () => targets.reduce((sum, m) => sum + (m.currentValue > 0 ? m.currentValue : 0), 0),
    [targets],
  )

  const outlookPreviewValue = useMemo(() => {
    const fromInputs = currentBalanceForScenarioBucket(bucket, inputs)
    return holdingsPreviewValue > 0 ? holdingsPreviewValue : fromInputs
  }, [bucket, holdingsPreviewValue, inputs])

  const outlookSelection = isOutlookScenarioChoice(uiChoice) ? uiChoice : null

  const showPerYearGrid =
    primaryModel &&
    activeTab === 'peryear' &&
    (uiChoice === 'peryear' || showScenarioOverrideYears(primaryModel, h))

  return {
    h,
    blended,
    globalPct,
    activeTab,
    onTabChange,
    outlookTiles: OUTLOOK_SCENARIO_TILES,
    outlookSelection,
    onSelectOutlookTile,
    outlookPreviewValue,
    draftPct,
    setDraftPct,
    tryPatchAccount,
    clampPct,
    parseScenarioPct,
    patchYearRates,
    primaryModel,
    showPerYearGrid,
    perYearCalendarYears,
    yearsToRetirement,
    calY,
    overrideConflict,
    onRemoveOverrides,
    onKeepBothOverrides,
    scenarioChoiceConflictLabel,
    clearToGlobalRate,
    targetRetirementAge: inputs.targetRetirementAge,
  }
}
