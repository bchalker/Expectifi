import { Accordion, Button } from '@heroui/react'
import { IconCheck, IconX } from '@tabler/icons-react'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AnimationEvent, Key } from 'react'
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

function parsePct(raw: string): number {
  const v = parseFloat((raw || '').replace(/,/g, ''))
  return Number.isFinite(v) ? v : 0
}

function clampPct(n: number): number {
  return Math.max(-100, Math.min(100, Math.round(n * 10) / 10))
}

type IntentId = 'default' | 'outlook' | 'custom' | 'peryear'

function intentFromScenarioChoice(choice: ScenarioUiChoice): IntentId {
  if (choice === 'peryear') return 'peryear'
  if (choice === 'custom') return 'custom'
  if (choice === 'bull' || choice === 'bear' || choice === 'base') return 'outlook'
  return 'default'
}

/** Plain percent text field; syncs when `rateDecimal` changes from outside. */
function FidelityYearPctField({
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
    <div className="fidelity-scenario-popout__year-input-wrap">
      <input
        type="text"
        inputMode="decimal"
        className="fidelity-scenario-popout__year-input"
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
      <span className="fidelity-scenario-popout__year-suffix" aria-hidden>
        %
      </span>
    </div>
  )
}

type OutlookChoice = 'bull' | 'bear' | 'base'

type OutlookTile = { choice: OutlookChoice; label: string; hint: string }

/** Bear / Normal / Bull segmented control (no HeroUI Tabs.Indicator). */
function OutlookMarketTabs({
  value,
  onChange,
  tiles,
}: {
  value: OutlookChoice
  onChange: (choice: OutlookChoice) => void
  tiles: readonly OutlookTile[]
}) {
  return (
    <div className="fidelity-scenario-outlook-tabs" role="tablist" aria-label="Market outlook">
      <div className="fidelity-scenario-outlook-tabs__list">
        {tiles.map((t) => (
          <button
            key={t.choice}
            type="button"
            role="tab"
            aria-selected={value === t.choice}
            className={`fidelity-scenario-outlook-tabs__tab fidelity-scenario-outlook-tabs__tab--${t.choice}${
              value === t.choice ? ' fidelity-scenario-outlook-tabs__tab--selected' : ''
            }`}
            onClick={() => onChange(t.choice)}
          >
            <span className="fidelity-scenario-outlook-tabs__tab-label">{t.label}</span>
            <span className="fidelity-scenario-outlook-tabs__tab-hint">{t.hint}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

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
  const [activeIntent, setActiveIntent] = useState<IntentId>('default')
  /** Which intent accordion section is expanded (null = all collapsed). */
  const [openIntent, setOpenIntent] = useState<Exclude<IntentId, 'default'> | null>(null)
  /** When true, ticker uses global default; the three custom path cards are dimmed and inert. */
  const [defaultResetOn, setDefaultResetOn] = useState(true)

  useEffect(() => {
    const resolved = commonChoice === SCENARIO_MIXED ? 'default' : commonChoice
    const inferredIntent = intentFromScenarioChoice(resolved)
    setUiChoice((prev) => {
      if (resolved === 'default' && prev === 'custom') return 'custom'
      return resolved
    })
    setActiveIntent((prev) => {
      if (resolved === 'default' && prev === 'custom') return 'custom'
      return inferredIntent
    })
    setDefaultResetOn((prev) => {
      if (resolved !== 'default') return false
      if (prev === false) return false
      return true
    })
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

  const onDefaultResetSwitchChange = useCallback(
    (on: boolean) => {
      if (on) {
        setDefaultResetOn(true)
        setActiveIntent('default')
        setUiChoice('default')
        patchAll('default', 0)
      } else {
        setDefaultResetOn(false)
        setDefaultOverlayExiting(true)
      }
    },
    [patchAll],
  )

  const prevDefaultResetOn = useRef(defaultResetOn)
  const [defaultOverlayExiting, setDefaultOverlayExiting] = useState(false)

  useLayoutEffect(() => {
    if (defaultResetOn) {
      setDefaultOverlayExiting(false)
    } else if (prevDefaultResetOn.current) {
      setDefaultOverlayExiting(true)
    }
    prevDefaultResetOn.current = defaultResetOn
  }, [defaultResetOn])

  const showDefaultOverlay = defaultResetOn || defaultOverlayExiting

  const onDefaultOverlayAnimationEnd = useCallback((e: AnimationEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.animationName !== 'fidelity-scenario-overlay-out') return
    setDefaultOverlayExiting(false)
  }, [])

  const onSelectOutlookIntent = useCallback(() => {
    if (defaultResetOn) return
    setDefaultResetOn(false)
    setActiveIntent('outlook')
    if (uiChoice === 'bull' || uiChoice === 'bear' || uiChoice === 'base') return
    setUiChoice('base')
    patchAll('base', 0)
  }, [defaultResetOn, patchAll, uiChoice])

  const onSelectOutlookTile = useCallback(
    (choice: 'bull' | 'bear' | 'base') => {
      if (defaultResetOn) return
      setDefaultResetOn(false)
      setActiveIntent('outlook')
      setUiChoice(choice)
      patchAll(choice, 0)
    },
    [defaultResetOn, patchAll],
  )

  const onSelectCustomIntent = useCallback(() => {
    if (defaultResetOn) return
    setDefaultResetOn(false)
    setActiveIntent('custom')
    setUiChoice('custom')
    applyCustomWithSeed()
  }, [applyCustomWithSeed, defaultResetOn])

  const onSelectPerYearIntent = useCallback(() => {
    if (defaultResetOn) return
    setDefaultResetOn(false)
    setActiveIntent('peryear')
    setUiChoice('peryear')
    patchAll('peryear', 0)
  }, [defaultResetOn, patchAll])

  useEffect(() => {
    if (defaultResetOn) {
      setOpenIntent(null)
      return
    }
    if (activeIntent === 'outlook' || activeIntent === 'custom' || activeIntent === 'peryear') {
      setOpenIntent(activeIntent)
    }
  }, [activeIntent, defaultResetOn])

  const onIntentAccordionChange = useCallback(
    (keys: 'all' | Iterable<Key>) => {
      if (defaultResetOn || keys === 'all') return
      const key = [...keys][0]
      if (key == null) {
        setOpenIntent(null)
        return
      }
      const id = String(key)
      if (id === 'outlook') {
        setOpenIntent('outlook')
        onSelectOutlookIntent()
      } else if (id === 'custom') {
        setOpenIntent('custom')
        onSelectCustomIntent()
      } else if (id === 'peryear') {
        setOpenIntent('peryear')
        onSelectPerYearIntent()
      }
    },
    [defaultResetOn, onSelectCustomIntent, onSelectOutlookIntent, onSelectPerYearIntent],
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

  const globalPct = (retRate * 100).toFixed(1)
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
    primaryModel && activeIntent === 'peryear' && (uiChoice === 'peryear' || showScenarioOverrideYears(primaryModel, h)) ? (
      <div className="fidelity-scenario-intent__year-grid">
        {modelingCalendarYears(calY, h).map((y, i) => {
          const rates = padYearlyReturns(primaryModel.yearlyReturns, h, primaryModel.flatRate)
          return (
            <div key={y} className="fidelity-scenario-intent__year-item">
              <span className="fidelity-scenario-popout__year-key">{y}</span>
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

  const intentOptions = useMemo(
    () => [
      {
        id: 'outlook' as const,
        primary: 'I would like to apply a market outlook',
      },
      {
        id: 'custom' as const,
        primary: 'I have a specific rate in mind',
      },
      {
        id: 'peryear' as const,
        primary: 'I would like to set a different rate for each year',
      },
    ],
    [],
  )

  return (
    <div className="fidelity-scenario-popout fidelity-scenario-popout--panel">
      <header className="fidelity-scenario-popout__head">
        <div className="fidelity-scenario-popout__head-stack">
          <div className="fidelity-scenario-popout__head-row">
            <h2 className="fidelity-scenario-popout__title" id="fidelity-scenario-panel-title">
              How would you like to set{' '}
              <span className="fidelity-scenario-popout__title-ticker">{scenarioTickerLabel || 'this ticker'}</span>{' '}
              growth?
            </h2>
            <button type="button" className="fidelity-scenario-popout__close" onClick={onClose} aria-label="Close">
              <IconX size={14} stroke={1.5} aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <div className="fidelity-scenario-popout__body">
        <SimpleBar className="fidelity-scenario-popout__scroll" autoHide={false}>
          <div className="fidelity-scenario-popout__scroll-inner">
            {showMoneyMarketNotice ? (
              <p className="fidelity-scenario-popout__money-market-note" role="note">
                Money market funds are pretty stable but won't move the needle much on returns, so scenario modeling isn't really useful here — but you can have at it if you want!
              </p>
            ) : null}
            <div className="fidelity-scenario-popout__intent-stack">
              {showDefaultOverlay ? (
                <div
                  className={`fidelity-scenario-intent__default-mode-overlay${
                    defaultOverlayExiting && !defaultResetOn ? ' fidelity-scenario-intent__default-mode-overlay--exiting' : ''
                  }`}
                  role="status"
                  aria-live="polite"
                  onAnimationEnd={onDefaultOverlayAnimationEnd}
                >
                  <div className="fidelity-scenario-intent__default-mode-overlay-inner">
                    <div className="fidelity-scenario-intent__default-mode-overlay-card">
                      <div
                        role="switch"
                        tabIndex={0}
                        aria-checked={defaultResetOn}
                        aria-labelledby="fidelity-scenario-default-switch-label"
                        className={`fidelity-scenario-popout__default-switch-card fidelity-scenario-popout__default-switch-card--in-message${
                          defaultResetOn ? '' : ' fidelity-scenario-popout__default-switch-card--off'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDefaultResetSwitchChange(!defaultResetOn)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onDefaultResetSwitchChange(!defaultResetOn)
                          }
                        }}
                      >
                        <div className="fidelity-scenario-popout__switch-row fidelity-scenario-popout__switch-row--in-message">
                          <span className="fidelity-scenario-intent__default-mode-overlay-switch-label" id="fidelity-scenario-default-switch-label">
                            Using your global default rate of <strong>{globalPct}%</strong>
                          </span>
                          <span className="fidelity-scenario-native-switch" aria-hidden />
                        </div>
                      </div>
                      <p className="fidelity-scenario-intent__default-mode-overlay-body">
                        Turn off the switch to model bull, bear, custom, or per-year returns for this ticker.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              {nHoldings > 1 ? (
                <p className="fidelity-scenario-popout__question-sub">
                  This will apply to the <strong>{nHoldings}</strong> holdings of this ticker across your accounts.
                </p>
              ) : null}
              <p className="fidelity-scenario-popout__intent-intro">
                Choose how you want to project growth for this holding. You can stick with the default rate, apply a market
                outlook that adjusts based on broader conditions, punch in a specific rate you have in mind, or get granular
                and set a different rate for each year. Pick whatever matches how you're thinking about this position.
              </p>
              {!defaultResetOn ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="fidelity-scenario-intent__keep-default-card"
                  onPress={() => {
                    onDefaultResetSwitchChange(true)
                    onClose()
                  }}
                >
                  Nevermind, just keep it at the default
                </Button>
              ) : null}
              <Accordion
                className={`fidelity-scenario-intent__accordion${defaultResetOn ? ' fidelity-scenario-intent__accordion--locked' : ''}`}
                aria-label="Growth modeling approach"
                hideSeparator
                expandedKeys={openIntent && !defaultResetOn ? [openIntent] : []}
                onExpandedChange={onIntentAccordionChange}
              >
                {intentOptions.map((opt) => {
                  const isActive = !defaultResetOn && activeIntent === opt.id
                  const isCustom = opt.id === 'custom'
                  return (
                    <Accordion.Item
                      key={opt.id}
                      id={opt.id}
                      className={`fidelity-scenario-intent__accordion-item fidelity-scenario-intent__accordion-item--${opt.id}${
                        isActive ? ' fidelity-scenario-intent__accordion-item--active' : ''
                      }`}
                    >
                      <Accordion.Heading>
                        <Accordion.Trigger className="fidelity-scenario-intent__accordion-trigger">
                          <span className="fidelity-scenario-intent__accordion-trigger-leading">
                            <span
                              className={`fidelity-scenario-intent__accordion-check${
                                isActive ? ' fidelity-scenario-intent__accordion-check--visible' : ''
                              }`}
                              aria-hidden
                            >
                              <IconCheck size={16} stroke={2.5} />
                            </span>
                            <span className="fidelity-scenario-intent__accordion-trigger-label">{opt.primary}</span>
                          </span>
                          {isCustom && !defaultResetOn ? (
                            <div
                              className="fidelity-scenario-intent__custom-trigger-field"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <div className="fidelity-scenario-intent__custom-input-wrap">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="fidelity-scenario-intent__custom-input"
                                  aria-label="Custom annual return percent"
                                  value={draftPct}
                                  onChange={(e) => {
                                    const s = e.target.value
                                    setDraftPct(s)
                                    patchAll('custom', parsePct(s))
                                  }}
                                />
                                <span className="fidelity-scenario-intent__custom-suffix" aria-hidden>
                                  %
                                </span>
                              </div>
                            </div>
                          ) : (
                            <Accordion.Indicator className="fidelity-scenario-intent__accordion-indicator" />
                          )}
                        </Accordion.Trigger>
                      </Accordion.Heading>
                      {isCustom ? null : (
                        <Accordion.Panel>
                          <Accordion.Body className="fidelity-scenario-intent__accordion-body">
                            {opt.id === 'outlook' ? (
                              <OutlookMarketTabs
                                value={outlookTabKey}
                                onChange={onSelectOutlookTile}
                                tiles={outlookTiles}
                              />
                            ) : null}
                            {opt.id === 'peryear' ? yearGrid : null}
                          </Accordion.Body>
                        </Accordion.Panel>
                      )}
                    </Accordion.Item>
                  )
                })}
              </Accordion>
            </div>
          </div>
        </SimpleBar>
      </div>
      <footer className="fidelity-scenario-popout__foot">
        <Button type="button" size="sm" variant="primary" className="fidelity-scenario-popout__done" onPress={onClose}>
          Done
        </Button>
      </footer>
    </div>
  )
}
