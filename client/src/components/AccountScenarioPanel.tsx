import { IconAlertSquareRounded, IconX } from '@tabler/icons-react'
import { AppOverlayScrollbars } from './ui/AppOverlayScrollbars'
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
import {
  accountScenarioManualHeaderNote,
  scenarioAllocationMismatchNote,
  type AccountDataSource,
  type AllocationProfile,
} from '../lib/allocationProfile'
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
import { parseScenarioPct } from './HoldingScenarioPopout'
import { HoldingScenarioIntentTabs, type ScenarioIntentTabId } from './HoldingScenarioIntentTabs'
import { HoldingScenarioPanelFooter } from './HoldingScenarioPanelFooter'
import { ScenarioPerYearGrid } from './ScenarioPerYearGrid'
import { AppButton } from './ui/AppButton'
import './HoldingScenarioPopout.scss'

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

export type AccountScenarioPanelProps = {
  accountName: string
  bucket: AccountScenarioBucketId
  onClose: () => void
  importedPositionRows: ImportedPositionRow[]
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  yearsToRetirement: number
  retirementCalendarYear: number
  retRate: number
  brkRate: number
  /** Focus this tab when the panel opens (e.g. from account row hint link). */
  initialTab?: ScenarioIntentTabId
  accountSource?: AccountDataSource | null
  allocationProfile?: AllocationProfile | null
  /** Manual account with no profile: close drawer and open row inline picker. */
  onRequestSetAllocationProfile?: () => void
}

export function AccountScenarioPanel({
  accountName,
  bucket,
  onClose,
  importedPositionRows,
  inputs,
  setInputs,
  yearsToRetirement,
  retirementCalendarYear,
  retRate,
  brkRate,
  initialTab,
  accountSource = null,
  allocationProfile = null,
  onRequestSetAllocationProfile,
}: AccountScenarioPanelProps) {
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

  const [draftPct, setDraftPct] = useState(() => String(decimalToPct(blended)))
  const [uiChoice, setUiChoice] = useState<ScenarioUiChoice>('default')
  const [activeTab, setActiveTab] = useState<ScenarioIntentTabId>('outlook')

  useEffect(() => {
    setUiChoice(resolvedChoice)
    setActiveTab(intentFromScenarioChoice(resolvedChoice))
  }, [resolvedChoice])

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab)
  }, [initialTab, bucket])

  useEffect(() => {
    if (stored) {
      const ch = inferAccountScenarioUiChoice(stored, blended, h)
      setDraftPct(String(decimalToPct(ch === 'custom' ? stored.flatRate : blended)))
    } else {
      setDraftPct(String(decimalToPct(blended)))
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

  const onNoScenario = useCallback(() => {
    clearToGlobalRate()
    onClose()
  }, [clearToGlobalRate, onClose])

  const primaryModel = useMemo(
    () => (stored ? accountScenarioToPositionModel(stored) : targets[0]),
    [stored, targets],
  )

  const applyCustomWithSeed = useCallback(() => {
    const seed = stored && inferAccountScenarioUiChoice(stored, blended, h) === 'custom'
      ? decimalToPct(stored.flatRate)
      : decimalToPct(blended)
    const seedStr = String(seed)
    setDraftPct(seedStr)
    tryPatchAccount('custom', parseScenarioPct(seedStr))
  }, [blended, h, stored, tryPatchAccount])

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
      } else if (tab === 'custom') {
        setUiChoice('custom')
        applyCustomWithSeed()
      } else if (tab === 'peryear') {
        setUiChoice('peryear')
        tryPatchAccount('peryear', 0)
      }
    },
    [applyCustomWithSeed, tryPatchAccount, uiChoice],
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

  const outlookTiles = OUTLOOK_SCENARIO_TILES

  const outlookSelection = isOutlookScenarioChoice(uiChoice) ? uiChoice : null

  const scenarioMismatchNote = scenarioAllocationMismatchNote(allocationProfile, outlookSelection)
  const isManual = accountSource === 'manual'
  const isHoldingsKnown = accountSource === 'csv' || accountSource === 'plaid'
  const manualHeaderNote = isManual ? accountScenarioManualHeaderNote(allocationProfile) : null
  const showSetProfileLink = isManual && !allocationProfile && Boolean(onRequestSetAllocationProfile)

  const yearGrid =
    primaryModel && activeTab === 'peryear' && (uiChoice === 'peryear' || showScenarioOverrideYears(primaryModel, h)) ? (
      <ScenarioPerYearGrid
        retirementCalendarYear={calY}
        yearsToRetirement={yearsToRetirement}
        globalBlended={blended}
        yearlyReturns={primaryModel.yearlyReturns}
        onPatchRates={patchYearRates}
      />
    ) : null

  return (
    <div className="holding-scenario-popout holding-scenario-popout--panel">
      <header className="holding-scenario-popout__head">
        <div className="holding-scenario-popout__head-stack">
          <div className="holding-scenario-popout__head-row">
            <h2 className="holding-scenario-popout__title" id="account-scenario-panel-title">
              Account scenario — {accountName}
            </h2>
            <button type="button" className="holding-scenario-popout__close" onClick={onClose} aria-label="Close">
              <IconX size={14} stroke={1.5} aria-hidden />
            </button>
          </div>
          {isHoldingsKnown ? (
            <p className="holding-scenario-popout__head-subtext" role="note">
              This rate applies to all holdings in <strong>{accountName}</strong> without a custom scenario.
            </p>
          ) : isManual && manualHeaderNote ? (
            <p className="holding-scenario-popout__head-subtext" role="note">
              {manualHeaderNote}
              {showSetProfileLink ? (
                <>
                  {' '}
                  <button
                    type="button"
                    className="holding-scenario-popout__head-link"
                    onClick={() => onRequestSetAllocationProfile?.()}
                  >
                    Set profile
                  </button>
                </>
              ) : null}
            </p>
          ) : (
            <p className="holding-scenario-popout__head-subtext" role="note">
              This rate applies to all holdings in <strong>{accountName}</strong> without a custom scenario.
            </p>
          )}
        </div>
      </header>
      <div className="holding-scenario-popout__body">
        <AppOverlayScrollbars className="holding-scenario-popout__scroll" defer={false}>
          <div className="holding-scenario-popout__scroll-inner">
            {overrideConflict ? (
              <div className="holding-scenario-override-conflict" role="status">
                <div className="holding-scenario-override-conflict__lead">
                  <IconAlertSquareRounded
                    className="holding-scenario-override-conflict__icon"
                    size={16}
                    stroke={1.5}
                    aria-hidden
                  />
                  <p className="holding-scenario-override-conflict__text">
                    <strong>{overrideConflict.count}</strong> holding
                    {overrideConflict.count === 1 ? '' : 's'} already have{' '}
                    <strong>{scenarioChoiceConflictLabel(overrideConflict.choice)}</strong> set individually.
                    Remove their overrides and let them inherit from this account instead?
                  </p>
                </div>
                <div className="holding-scenario-override-conflict__actions">
                  <AppButton
                    type="button"
                    size="sm"
                    variant="primary"
                    className="holding-scenario-override-conflict__btn"
                    onPress={onRemoveOverrides}
                  >
                    Remove overrides
                  </AppButton>
                  <AppButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="holding-scenario-override-conflict__btn"
                    onPress={onKeepBothOverrides}
                  >
                    Keep both
                  </AppButton>
                </div>
              </div>
            ) : null}
            <div className="holding-scenario-popout__intent-stack">
              <HoldingScenarioIntentTabs
                variant="account"
                activeTab={activeTab}
                onTabChange={onTabChange}
                outlookValue={outlookSelection}
                onOutlookChange={onSelectOutlookTile}
                outlookTiles={outlookTiles}
                globalBlended={blended}
                outlookHorizon={h}
                outlookPreviewCurrentValue={outlookPreviewValue}
                accountName={accountName}
                accountRetirementYear={calY}
                accountCurrentBalance={outlookPreviewValue > 0 ? outlookPreviewValue : undefined}
                draftPct={draftPct}
                onDraftPctChange={(s) => {
                  setDraftPct(s)
                  tryPatchAccount('custom', parseScenarioPct(s))
                }}
                onDraftPctBlur={() => {
                  const nextPct = clampPct(parseScenarioPct(draftPct))
                  setDraftPct(String(nextPct))
                  tryPatchAccount('custom', nextPct)
                }}
                yearGrid={yearGrid}
                scenarioMismatchNote={scenarioMismatchNote}
              />
            </div>
          </div>
        </AppOverlayScrollbars>
      </div>
      <HoldingScenarioPanelFooter globalPct={globalPct} onNoScenario={onNoScenario} onDone={onClose} />
    </div>
  )
}
