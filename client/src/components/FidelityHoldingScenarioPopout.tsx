import { Button } from '@heroui/react'
import { IconX } from '@tabler/icons-react'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import { isFidelityMoneyMarketRow, normalizeFidelityImportSymbol, type FidelityPositionRow } from '../lib/fidelityCsv'
import {
  applyScenarioUiChoice,
  horizonClamp,
  inferCommonScenarioChoiceForModels,
  inferScenarioUiChoice,
  mergePatchPositionModelsIntoInputs,
  type ScenarioUiChoice,
  SCENARIO_MIXED,
} from '../lib/holdingScenarioApply'
import {
  blendedRateForDashboardPositionId,
  computeMergedDashboardPositionModels,
  countFidelityImportLinesMatchingTickerKeys,
  mergedDashboardModelsForTickerKeys,
  tickerKeySetFromFidelityRows,
} from '../lib/mergedDashboardPositionModels'
import {
  decimalToPct,
  modelingCalendarYears,
  padYearlyReturns,
  pctToDecimal,
  ratesMatchScenario,
  type PositionReturnModel,
} from '../lib/positionReturnModel'
import { HoldingScenarioIntentTabs, type ScenarioIntentTabId } from './HoldingScenarioIntentTabs'
import './FidelityHoldingScenarioPopout.scss'

function showScenarioOverrideYears(m: PositionReturnModel, horizon: number): boolean {
  const h = horizonClamp(horizon)
  return (
    m.returnMode === 'scenario' &&
    m.scenario != null &&
    !ratesMatchScenario(m.scenario, padYearlyReturns(m.yearlyReturns, h, m.flatRate), h)
  )
}

export type FidelityHoldingScenarioPanelProps = {
  onClose: () => void
  contributingRows: FidelityPositionRow[]
  fidelityAllRows: FidelityPositionRow[]
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  yearsToRetirement: number
  retirementCalendarYear: number
  retRate: number
  brkRate: number
}

export function parseScenarioPct(raw: string): number {
  const v = parseFloat((raw || '').replace(/,/g, ''))
  return Number.isFinite(v) ? v : 0
}

function parsePct(raw: string): number {
  return parseScenarioPct(raw)
}

function clampPct(n: number): number {
  return Math.max(-100, Math.min(100, Math.round(n * 10) / 10))
}

function intentFromScenarioChoice(choice: ScenarioUiChoice): ScenarioIntentTabId {
  if (choice === 'peryear') return 'peryear'
  if (choice === 'custom') return 'custom'
  if (choice === 'bull' || choice === 'bear' || choice === 'base') return 'outlook'
  return 'default'
}

/** Plain percent text field; syncs when `rateDecimal` changes from outside. */
export function FidelityYearPctField({
  calendarYear,
  rateDecimal,
  onCommitDecimal,
}: {
  calendarYear: number
  rateDecimal: number
  onCommitDecimal: (dec: number) => void
}) {
  const [text, setText] = useState(() => String(decimalToPct(rateDecimal)))

  useEffect(() => {
    setText(String(decimalToPct(rateDecimal)))
  }, [rateDecimal])

  const commitText = useCallback(
    (raw: string) => {
      const nextPct = clampPct(parsePct(raw))
      setText(String(nextPct))
      onCommitDecimal(pctToDecimal(nextPct))
    },
    [onCommitDecimal],
  )

  return (
    <div className="holding-scenario-popout__year-input-wrap">
      <input
        type="text"
        inputMode="decimal"
        className="holding-scenario-popout__year-input"
        aria-label={`Return percent for ${calendarYear}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commitText(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitText(text)
            e.currentTarget.blur()
          }
        }}
      />
      <span className="holding-scenario-popout__year-suffix" aria-hidden>
        %
      </span>
    </div>
  )
}

export { OutlookMarketTabs } from './HoldingScenarioIntentTabs'

/** Return scenario editor body (slide panel / popover). */
export function FidelityHoldingScenarioPanel({
  onClose,
  contributingRows,
  fidelityAllRows,
  inputs,
  setInputs,
  yearsToRetirement,
  retirementCalendarYear,
  retRate,
  brkRate,
}: FidelityHoldingScenarioPanelProps) {
  const h = horizonClamp(yearsToRetirement)
  const calY = retirementCalendarYear

  const merged = useMemo(
    () => computeMergedDashboardPositionModels(inputs, fidelityAllRows, yearsToRetirement, retirementCalendarYear),
    [inputs, fidelityAllRows, yearsToRetirement, retirementCalendarYear],
  )

  const symbolKeys = useMemo(() => tickerKeySetFromFidelityRows(contributingRows), [contributingRows])

  const scenarioTickerLabel = useMemo(() => {
    const keys = [...symbolKeys].filter(Boolean).sort((a, b) => a.localeCompare(b))
    if (keys.length === 1) return keys[0]!
    if (keys.length > 1) return keys.join(', ')
    const row = contributingRows[0]
    return row ? normalizeFidelityImportSymbol(row.symbol).toUpperCase() : ''
  }, [symbolKeys, contributingRows])

  const showMoneyMarketNotice = useMemo(() => contributingRows.some(isFidelityMoneyMarketRow), [contributingRows])

  const targets = useMemo(() => {
    const list = mergedDashboardModelsForTickerKeys(merged, symbolKeys)
    return [...list].sort((a, b) => a.id.localeCompare(b.id))
  }, [merged, symbolKeys])

  const importLineCountForSymbol = useMemo(
    () => countFidelityImportLinesMatchingTickerKeys(fidelityAllRows, symbolKeys),
    [fidelityAllRows, symbolKeys],
  )

  const commonChoice = useMemo(
    () =>
      targets.length
        ? inferCommonScenarioChoiceForModels(targets, h, (m) => blendedRateForDashboardPositionId(m.id, retRate, brkRate))
        : SCENARIO_MIXED,
    [targets, h, retRate, brkRate],
  )

  const [draftPct, setDraftPct] = useState(String(decimalToPct(retRate)))
  const [uiChoice, setUiChoice] = useState<ScenarioUiChoice>('default')
  const [activeTab, setActiveTab] = useState<ScenarioIntentTabId>('default')

  useEffect(() => {
    const resolved = commonChoice === SCENARIO_MIXED ? 'default' : commonChoice
    setUiChoice(resolved)
    setActiveTab(intentFromScenarioChoice(resolved))
    const first = targets[0]
    if (first) {
      const blended = blendedRateForDashboardPositionId(first.id, retRate, brkRate)
      const ch = inferScenarioUiChoice(first, blended, h)
      setDraftPct(String(decimalToPct(ch === 'custom' ? first.flatRate : blended)))
    }
  }, [commonChoice, targets, h, retRate, brkRate])

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

  const applyCustomWithSeed = useCallback(() => {
    const pm = targets[0]
    const pmBlend = pm ? blendedRateForDashboardPositionId(pm.id, retRate, brkRate) : retRate
    const seed =
      pm && inferScenarioUiChoice(pm, pmBlend, h) === 'custom'
        ? decimalToPct(pm.flatRate)
        : decimalToPct(pmBlend)
    const seedStr = String(seed)
    setDraftPct(seedStr)
    patchAll('custom', parsePct(seedStr))
  }, [h, patchAll, retRate, brkRate, targets])

  const useGlobalRate = useCallback(() => {
    setActiveTab('default')
    setUiChoice('default')
    patchAll('default', 0)
  }, [patchAll])

  const onSelectOutlookTile = useCallback(
    (choice: 'bull' | 'bear' | 'base') => {
      setUiChoice(choice)
      patchAll(choice, 0)
    },
    [patchAll],
  )

  const onTabChange = useCallback(
    (tab: ScenarioIntentTabId) => {
      setActiveTab(tab)
      if (tab === 'outlook') {
        if (uiChoice === 'bull' || uiChoice === 'bear' || uiChoice === 'base') return
        setUiChoice('base')
        patchAll('base', 0)
      } else if (tab === 'custom') {
        setUiChoice('custom')
        applyCustomWithSeed()
      } else if (tab === 'peryear') {
        setUiChoice('peryear')
        patchAll('peryear', 0)
      }
    },
    [applyCustomWithSeed, patchAll, uiChoice],
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
  const globalPct = (globalBlended * 100).toFixed(1)
  const globalUsingActive = commonChoice === 'default'
  const nHoldings = importLineCountForSymbol

  const outlookTiles = useMemo(
    () => [
      { choice: 'bear' as const, label: 'Bear', hint: 'Leans negative' },
      { choice: 'base' as const, label: 'Normal', hint: 'Neutral' },
      { choice: 'bull' as const, label: 'Bull', hint: 'Leans positive' },
    ],
    [],
  )

  const outlookTabKey =
    uiChoice === 'bull' || uiChoice === 'bear' || uiChoice === 'base' ? uiChoice : 'base'

  const yearGrid =
    primaryModel && activeTab === 'peryear' && (uiChoice === 'peryear' || showScenarioOverrideYears(primaryModel, h)) ? (
      <div className="holding-scenario-intent__year-grid">
        {modelingCalendarYears(calY, h).map((y, i) => {
          const rates = padYearlyReturns(primaryModel.yearlyReturns, h, primaryModel.flatRate)
          return (
            <div key={y} className="holding-scenario-intent__year-item">
              <span className="holding-scenario-popout__year-key">{y}</span>
              <FidelityYearPctField
                calendarYear={y}
                rateDecimal={rates[i] ?? 0}
                onCommitDecimal={(dec) => {
                  const next = [...rates]
                  next[i] = dec
                  patchYearRates(next)
                }}
              />
            </div>
          )
        })}
      </div>
    ) : null

  return (
    <div className="holding-scenario-popout holding-scenario-popout--panel">
      <header className="holding-scenario-popout__head">
        <div className="holding-scenario-popout__head-stack">
          <div className="holding-scenario-popout__head-row">
            <h2 className="holding-scenario-popout__title" id="holding-scenario-panel-title">
              How would you like to set{' '}
              <span className="holding-scenario-popout__title-ticker">{scenarioTickerLabel || 'this ticker'}</span>{' '}
              growth?
            </h2>
            <button type="button" className="holding-scenario-popout__close" onClick={onClose} aria-label="Close">
              <IconX size={14} stroke={1.5} aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <div className="holding-scenario-popout__body">
        <SimpleBar className="holding-scenario-popout__scroll" autoHide={false}>
          <div className="holding-scenario-popout__scroll-inner">
            {showMoneyMarketNotice ? (
              <p className="holding-scenario-popout__money-market-note" role="note">
                Money market funds are pretty stable but won't move the needle much on returns, so scenario modeling isn't really useful here — but you can have at it if you want!
              </p>
            ) : null}
            <div className="holding-scenario-popout__intent-stack">
              {nHoldings > 1 ? (
                <p className="holding-scenario-popout__question-sub">
                  This will apply to the <strong>{nHoldings}</strong> holdings of this ticker across your accounts.
                </p>
              ) : null}
              <HoldingScenarioIntentTabs
                variant="holding"
                activeTab={activeTab}
                onTabChange={onTabChange}
                globalPct={globalPct}
                globalUsingActive={globalUsingActive}
                onUseGlobalRate={useGlobalRate}
                outlookValue={outlookTabKey}
                onOutlookChange={onSelectOutlookTile}
                outlookTiles={outlookTiles}
                draftPct={draftPct}
                onDraftPctChange={(s) => {
                  setDraftPct(s)
                  patchAll('custom', parsePct(s))
                }}
                onDraftPctBlur={() => {
                  const nextPct = clampPct(parsePct(draftPct))
                  setDraftPct(String(nextPct))
                  patchAll('custom', nextPct)
                }}
                yearGrid={yearGrid}
              />
            </div>
          </div>
        </SimpleBar>
      </div>
      <footer className="holding-scenario-popout__foot">
        <Button type="button" size="sm" variant="primary" className="holding-scenario-popout__done" onPress={onClose}>
          Done
        </Button>
      </footer>
    </div>
  )
}
