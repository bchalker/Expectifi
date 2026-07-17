import { IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import type { ImportedPositionRow } from '../lib/positionsCsv'
import {
  decimalToPct,
  pctToDecimal,
} from '../lib/positionReturnModel'
import { useHoldingScenarioState } from '../hooks/useHoldingScenarioState'
import type { ScenarioIntentTabId } from './HoldingScenarioIntentTabs'
import { HoldingScenarioPanelFooter } from './HoldingScenarioPanelFooter'
import { ScenarioPerYearGrid } from './ScenarioPerYearGrid'
import { AccountScenarioOutlookGrid } from './accountScenario/AccountScenarioOutlookGrid'
import { AccountScenarioPopoutCustomRate } from './accountScenario/AccountScenarioPopoutCustomRate'
import './accountScenario/AccountScenarioPopout.scss'
import './HoldingScenarioPopout.scss'

const TABS: { id: ScenarioIntentTabId; label: string }[] = [
  { id: 'outlook', label: 'Market outlook' },
  { id: 'custom', label: 'Custom rate' },
  { id: 'peryear', label: 'Per year' },
]

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

const YEAR_PCT_STEP = 0.5

/** Plain percent text field; syncs when `rateDecimal` changes from outside. */
export function HoldingYearPctField({
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

  const stepByArrow = useCallback(
    (direction: -1 | 1) => {
      const nextPct = clampPct(parsePct(text) + direction * YEAR_PCT_STEP)
      setText(String(nextPct))
      onCommitDecimal(pctToDecimal(nextPct))
    },
    [onCommitDecimal, text],
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
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            stepByArrow(1)
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            stepByArrow(-1)
          } else if (e.key === 'Enter') {
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

export type HoldingScenarioPopoutProps = {
  contributingRows: ImportedPositionRow[]
  importedPositionRows: ImportedPositionRow[]
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  yearsToRetirement: number
  retirementCalendarYear: number
  retRate: number
  brkRate: number
  initialTab?: ScenarioIntentTabId
  onClose: () => void
  /** Inside HeroUI Popover — chrome comes from popover shell. */
  variant?: 'standalone' | 'heroui'
  /** Resets editor state when opening a different holding panel. */
  panelInstanceKey?: string
}

/** @deprecated Use HoldingScenarioPopout — kept for import sites during migration. */
export type HoldingScenarioPanelProps = HoldingScenarioPopoutProps

/** Return scenario editor — matches account scenario popout layout. */
export function HoldingScenarioPopout({
  contributingRows,
  importedPositionRows,
  inputs,
  setInputs,
  yearsToRetirement,
  retirementCalendarYear,
  retRate,
  brkRate,
  initialTab,
  onClose,
  variant = 'standalone',
  panelInstanceKey,
}: HoldingScenarioPopoutProps) {
  const state = useHoldingScenarioState({
    contributingRows,
    inputs,
    setInputs,
    importedPositionRows,
    yearsToRetirement,
    retirementCalendarYear,
    retRate,
    brkRate,
    initialTab,
    panelInstanceKey,
  })

  const onNoScenario = () => {
    state.clearToGlobalRate()
    onClose()
  }

  return (
    <div
      className={[
        'account-scenario-popout',
        variant === 'heroui' && 'account-scenario-popout--heroui-inner',
      ]
        .filter(Boolean)
        .join(' ')}
      role={variant === 'standalone' ? 'dialog' : undefined}
      aria-labelledby="holding-scenario-popout-title"
    >
      <header className="account-scenario-popout__head">
        <div className="account-scenario-popout__head-text">
          <p className="account-scenario-popout__eyebrow">Holding scenario</p>
          <h2 className="account-scenario-popout__title" id="holding-scenario-popout-title">
            {state.scenarioTickerLabel || 'This holding'}
          </h2>
        </div>
        <button
          type="button"
          className="account-scenario-popout__close"
          onClick={onClose}
          aria-label="Close"
        >
          <IconX size={14} stroke={1.5} aria-hidden />
        </button>
      </header>

      <div className="account-scenario-popout__tabs" role="tablist" aria-label="Scenario type">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={state.activeTab === tab.id}
            className={[
              'account-scenario-popout__tab',
              state.activeTab === tab.id && 'account-scenario-popout__tab--active',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => state.onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="account-scenario-popout__body">
        {state.showMoneyMarketNotice ? (
          <p className="account-scenario-popout__conflict-text holding-scenario-popout__notice" role="note">
            Money market funds are pretty stable but won&apos;t move the needle much on returns, so scenario
            modeling isn&apos;t really useful here — but you can have at it if you want!
          </p>
        ) : null}
        {state.importLineCountForSymbol > 1 ? (
          <p className="account-scenario-popout__conflict-text holding-scenario-popout__notice" role="note">
            This will apply to the <strong>{state.importLineCountForSymbol}</strong> holdings of this ticker
            across your accounts.
          </p>
        ) : null}

        {state.activeTab === 'outlook' ? (
          <AccountScenarioOutlookGrid
            horizon={state.h}
            selection={state.outlookSelection}
            onSelect={state.onSelectOutlookTile}
            rateBasis="relative"
            globalBlended={state.globalBlended}
          />
        ) : null}

        {state.activeTab === 'custom' ? (
          <AccountScenarioPopoutCustomRate
            draftPct={state.draftPct}
            onDraftPctChange={(value) => {
              state.setDraftPct(value)
              state.patchAll('custom', state.parseScenarioPct(value))
            }}
            onDraftPctBlur={() => {
              const nextPct = state.clampPct(state.parseScenarioPct(state.draftPct))
              state.setDraftPct(String(nextPct))
              state.patchAll('custom', nextPct)
            }}
          />
        ) : null}

        {state.activeTab === 'peryear' && state.showPerYearGrid && state.primaryModel ? (
          <ScenarioPerYearGrid
            className="scenario-per-year-grid--popout"
            retirementCalendarYear={state.calY}
            yearsToRetirement={state.yearsToRetirement}
            globalBlended={state.globalBlended}
            yearlyReturns={state.primaryModel.yearlyReturns}
            onPatchRates={state.patchYearRates}
          />
        ) : null}
      </div>

      <HoldingScenarioPanelFooter
        className="account-scenario-popout__foot"
        hasScenario={state.resolvedChoice !== 'default'}
        onNoScenario={onNoScenario}
        onDone={onClose}
      />
    </div>
  )
}

/** @deprecated Use HoldingScenarioPopout */
export const HoldingScenarioPanel = HoldingScenarioPopout
