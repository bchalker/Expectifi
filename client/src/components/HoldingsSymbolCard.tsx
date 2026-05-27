import { useId, useState, type ReactNode } from 'react'
import type { HoldingReturnRateSource } from '../lib/accountReturnScenario'
import {
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import { fmt } from '../utils/format'
import { PortfolioScenarioCell } from './PortfolioScenarioCell'
import type { HoldingsScenarioTriggerVariant } from './HoldingsScenarioTrigger'
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
  breakdown = null,
}: HoldingsSymbolCardProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false)
  const breakdownPanelId = useId()
  const valueAmount = (
    <span className="holdings-symbol-card__value">{fmt(currentValue)}</span>
  )

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
        {scenario || breakdown ? (
          <div className="holdings-symbol-card__actions">
            {scenario ? <HoldingsSymbolCardScenarioPanel scenario={scenario} /> : null}
            {breakdown ? (
              <button
                type="button"
                className="holdings-symbol-card__aggregate-toggle"
                aria-expanded={breakdownOpen}
                aria-controls={breakdownPanelId}
                aria-label={breakdownOpen ? 'Hide account breakdown' : 'Show account breakdown'}
                onClick={() => setBreakdownOpen((open) => !open)}
              >
                <HoldingAggregateHint
                  className="holdings-symbol-card__aggregate-hint"
                  expanded={breakdownOpen}
                />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {breakdown ? (
        <div
          id={breakdownPanelId}
          className={[
            'holdings-symbol-card__breakdown',
            breakdownOpen ? 'holdings-symbol-card__breakdown--open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="holdings-symbol-card__breakdown-inner">{breakdown}</div>
        </div>
      ) : null}
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
        rowActive={scenario.rowActive}
        onOpen={scenario.onOpen}
      />
    </div>
  )
}
