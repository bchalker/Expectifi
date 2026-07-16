import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { HoldingReturnRateSource } from '../lib/accountReturnScenario'
import {
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import type { ImportedPositionRow } from '../lib/positionsCsv'
import { useScenarioPopout } from '../context/ScenarioPopoutContext'
import { fmt } from '../utils/format'
import { HoldingsBreakdownPopout } from './HoldingsBreakdownPopout'
import { PortfolioScenarioCell } from './PortfolioScenarioCell'
import type { HoldingsScenarioTriggerVariant } from './HoldingsScenarioTrigger'
import { HoldingAggregateHint } from './ui/HoldingAggregateHint'
import './HoldingsSymbolCard.scss'

const BREAKDOWN_CLOSE_DELAY_MS = 160

export type { HoldingsScenarioTriggerVariant } from './HoldingsScenarioTrigger'
export {
  HoldingsScenarioTrigger,
  holdingsScenarioTriggerChoiceClass,
} from './HoldingsScenarioTrigger'

export type HoldingsSymbolCardScenarioProps = {
  symbol: string
  scopeKey: string
  contributingRows: ImportedPositionRow[]
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  customPctDecimal?: number
  inheritAccent?: ScenarioUiChoice | null
  /** Holding rows: show when holding scenario diverges from account scenario. */
  overridesAccountScenario?: boolean
  rateSource?: HoldingReturnRateSource
}

export type HoldingsSymbolCardProps = {
  className?: string
  symbol: string
  description: ReactNode
  currentValue: number
  costBasis: number | null
  scenario?: HoldingsSymbolCardScenarioProps | null
  breakdownNote?: ReactNode
  breakdown?: ReactNode
}

export function HoldingsSymbolCard({
  className = '',
  symbol,
  description,
  currentValue,
  costBasis,
  scenario = null,
  breakdownNote = null,
  breakdown = null,
}: HoldingsSymbolCardProps) {
  const { isHoldingScenarioOpen } = useScenarioPopout()
  const scenarioActive =
    scenario != null && isHoldingScenarioOpen(scenario.symbol, scenario.scopeKey)
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const breakdownPanelId = useId()
  const breakdownToggleRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inheritsAccountScenario =
    scenario != null &&
    scenario.rateSource === 'account' &&
    scenario.variant === 'outline'
  const valueAmount = (
    <span className="holdings-symbol-card__value">{fmt(currentValue)}</span>
  )

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const openBreakdown = useCallback(() => {
    clearCloseTimer()
    setBreakdownOpen(true)
  }, [clearCloseTimer])

  const scheduleCloseBreakdown = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = setTimeout(() => {
      setBreakdownOpen(false)
      closeTimerRef.current = null
    }, BREAKDOWN_CLOSE_DELAY_MS)
  }, [clearCloseTimer])

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

  const breakdownToggle = breakdown ? (
    <>
      <button
        ref={breakdownToggleRef}
        type="button"
        className={[
          'holdings-symbol-card__aggregate-toggle',
          breakdownOpen && 'holdings-symbol-card__aggregate-toggle--open',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={breakdownOpen}
        aria-haspopup="dialog"
        aria-controls={breakdownPanelId}
        aria-label="Show account breakdown"
        onPointerEnter={openBreakdown}
        onPointerLeave={scheduleCloseBreakdown}
        onFocus={openBreakdown}
        onBlur={scheduleCloseBreakdown}
      >
        <HoldingAggregateHint expanded={breakdownOpen} />
      </button>
      <HoldingsBreakdownPopout
        open={breakdownOpen}
        anchorRef={breakdownToggleRef}
        panelId={breakdownPanelId}
        onClose={() => {
          clearCloseTimer()
          setBreakdownOpen(false)
        }}
        onMouseEnterPopout={openBreakdown}
        onMouseLeavePopout={scheduleCloseBreakdown}
        note={breakdownNote}
      >
        {breakdown}
      </HoldingsBreakdownPopout>
    </>
  ) : null

  return (
    <article
      className={[
        'holdings-symbol-card',
        scenarioActive ? 'holdings-symbol-card--scenario-active' : '',
        breakdown ? 'holdings-symbol-card--has-breakdown' : '',
        breakdown && breakdownOpen ? 'holdings-symbol-card--breakdown-open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="holdings-symbol-card__summary-row">
        <div className="holdings-symbol-card__content">
          <div className="holdings-symbol-card__left">
            <div className="holdings-symbol-card__left-main">
              <div className="holdings-symbol-card__symbol-row">
                <span className="holdings-symbol-card__symbol">{symbol}</span>
                {breakdownToggle}
              </div>
              {description}
            </div>
          </div>
        </div>
        {scenario ? (
          <div
            className={[
              'holdings-symbol-card__actions',
              inheritsAccountScenario && 'holdings-symbol-card__actions--inherits-account',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <HoldingsSymbolCardScenarioPanel scenario={scenario} />
          </div>
        ) : null}
        <div className="holdings-symbol-card__right">
          <div className="holdings-symbol-card__field holdings-symbol-card__field--value">
            <span className="holdings-symbol-card__field-label">Value:</span>
            {valueAmount}
          </div>
          <div className="holdings-symbol-card__field holdings-symbol-card__field--basis">
            <span className="holdings-symbol-card__field-label">Cost Basis:</span>
            <span className="holdings-symbol-card__basis">
              {costBasis != null ? fmt(costBasis) : '—'}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

export function HoldingsSymbolCardScenarioPanel({
  scenario,
}: {
  scenario: HoldingsSymbolCardScenarioProps
}) {
  return (
    <div className="holdings-symbol-card__scenario">
      <PortfolioScenarioCell
        layout="holding"
        symbol={scenario.symbol}
        scopeKey={scenario.scopeKey}
        contributingRows={scenario.contributingRows}
        label={scenario.label}
        common={scenario.common}
        variant={scenario.variant}
        inheritAccent={scenario.inheritAccent}
        rateSource={scenario.rateSource}
        overridesAccountScenario={scenario.overridesAccountScenario}
      />
    </div>
  )
}
