import { IconCirclePlus } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import {
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import { fmt } from '../utils/format'
import './HoldingsSymbolCard.scss'
import './FidelityHoldingScenarioPopout.scss'

export function holdingsScenarioTriggerChoiceClass(
  choice: ScenarioUiChoice | typeof SCENARIO_MIXED,
): string {
  if (choice === 'default' || choice === SCENARIO_MIXED) return ''
  if (choice === 'base') return 'holdings-scenario-trigger--normal'
  return `holdings-scenario-trigger--${choice}`
}

type HoldingsScenarioTriggerProps = {
  label: string
  showAccent: boolean
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  rowActive: boolean
  onOpen: () => void
  className?: string
}

export function HoldingsScenarioTrigger({
  label,
  showAccent,
  common,
  rowActive,
  onOpen,
  className = '',
}: HoldingsScenarioTriggerProps) {
  return (
    <button
      type="button"
      className={[
        'holdings-scenario-trigger',
        showAccent ? 'holdings-scenario-trigger--chosen' : '',
        showAccent ? holdingsScenarioTriggerChoiceClass(common) : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-holdings-scenario-trigger
      aria-expanded={rowActive}
      aria-haspopup="dialog"
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
    >
      <span className="holdings-scenario-trigger__label">{label}</span>
      <span className="holdings-scenario-plus" aria-hidden>
        <IconCirclePlus size={13} stroke={1.25} />
      </span>
    </button>
  )
}

export type HoldingsSymbolCardScenarioProps = {
  label: string
  showAccent: boolean
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  rowActive: boolean
  onOpen: () => void
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
  const valueAmount = (
    <span className="holdings-symbol-card__value">{fmt(currentValue)}</span>
  )

  return (
    <article
      className={[
        'holdings-symbol-card',
        scenarioActive ? 'holdings-symbol-card--scenario-active' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="holdings-symbol-card__content">
        <div className="holdings-symbol-card__left">
          <div className="holdings-symbol-card__left-main">
            <div className="holdings-symbol-card__symbol-row">
              <span className="holdings-symbol-card__scenario-dot" aria-hidden />
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
        {breakdown ? <div className="holdings-symbol-card__breakdown">{breakdown}</div> : null}
      </div>
      {scenario ? <HoldingsSymbolCardScenarioPanel scenario={scenario} /> : null}
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
      <div className="holdings-symbol-card__scenario-slot">
        <HoldingsScenarioTrigger
          label={scenario.label}
          showAccent={scenario.showAccent}
          common={scenario.common}
          rowActive={scenario.rowActive}
          onOpen={scenario.onOpen}
        />
      </div>
    </div>
  )
}
