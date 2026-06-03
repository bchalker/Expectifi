import { useId, useRef, useState, type ReactNode } from 'react'
import type { HoldingReturnRateSource } from '../lib/accountReturnScenario'
import {
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import { fmt } from '../utils/format'
import { HoldingsBreakdownPopout } from './HoldingsBreakdownPopout'
import { PortfolioScenarioCell } from './PortfolioScenarioCell'
import type { HoldingsScenarioTriggerVariant } from './HoldingsScenarioTrigger'
import { Tooltip } from './Tooltip'
import { HoldingAggregateHint } from './ui/HoldingAggregateHint'
import './HoldingsSymbolCard.scss'

export type { HoldingsScenarioTriggerVariant } from './HoldingsScenarioTrigger'
export {
  HoldingsScenarioTrigger,
  holdingsScenarioTriggerChoiceClass,
} from './HoldingsScenarioTrigger'

export type HoldingsSymbolCardScenarioProps = {
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  inheritAccent?: ScenarioUiChoice | null
  /** Holding rows: show when holding scenario diverges from account scenario. */
  overridesAccountScenario?: boolean
  rowActive: boolean
  onOpen: () => void
  rateSource?: HoldingReturnRateSource
}

export type HoldingsSymbolCardProps = {
  className?: string
  scenarioActive?: boolean
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
  scenarioActive = false,
  symbol,
  description,
  currentValue,
  costBasis,
  scenario = null,
  breakdownNote = null,
  breakdown = null,
}: HoldingsSymbolCardProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const breakdownPanelId = useId()
  const breakdownToggleRef = useRef<HTMLButtonElement>(null)
  const inheritsAccountScenario =
    scenario != null &&
    scenario.rateSource === 'account' &&
    scenario.variant === 'outline'
  const valueAmount = (
    <span className="holdings-symbol-card__value">{fmt(currentValue)}</span>
  )

  const breakdownToggle = breakdown ? (
    <>
      <Tooltip
        nativeTrigger
        variant="dark"
        delay={400}
        closeDelay={150}
        placement="bottom"
        content={breakdownOpen ? 'Hide account breakdown' : 'Show account breakdown'}
      >
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
          aria-label={breakdownOpen ? 'Hide account breakdown' : 'Show account breakdown'}
          onClick={(e) => {
            e.stopPropagation()
            setBreakdownOpen((open) => !open)
          }}
        >
          <HoldingAggregateHint expanded={breakdownOpen} />
        </button>
      </Tooltip>
      <HoldingsBreakdownPopout
        open={breakdownOpen}
        anchorRef={breakdownToggleRef}
        panelId={breakdownPanelId}
        onClose={() => setBreakdownOpen(false)}
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
      </div>
    </article>
  )
}

export function HoldingsSymbolCardScenarioPanel({
  scenario,
}: {
  scenario: HoldingsSymbolCardScenarioProps
}) {
  const inheritAccent =
    scenario.rateSource === 'account' ? (scenario.inheritAccent ?? null) : null

  return (
    <div className="holdings-symbol-card__scenario">
      <PortfolioScenarioCell
        layout="holding"
        label={scenario.label}
        common={scenario.common}
        variant={scenario.variant}
        inheritAccent={inheritAccent}
        rateSource={scenario.rateSource}
        overridesAccountScenario={scenario.overridesAccountScenario}
        rowActive={scenario.rowActive}
        onOpen={scenario.onOpen}
      />
    </div>
  )
}
