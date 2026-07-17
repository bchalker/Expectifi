import { useCallback, useRef, useState } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { useClickOutside } from '../hooks/useClickOutside'
import {
  getMarketScenarioDefinition,
  MARKET_SCENARIO_ILLUSTRATIVE_NOTE,
  MARKET_SCENARIOS,
  type MarketScenarioId,
} from '../lib/marketScenario'
import { ModeButtonGroup } from './ModeButton'
import './HoldingScenarioPopout.scss'
import './MarketScenarioSelector.scss'

const MARKET_SCENARIO_SUBLABEL = 'Market Scenario'

const MARKET_SCENARIO_BUTTON_OPTIONS = MARKET_SCENARIOS.map((scenario) => ({
  id: scenario.id,
  label: scenario.label,
}))

function marketScenarioTriggerClass(id: MarketScenarioId): string {
  if (id === 'bull') return 'holdings-scenario-trigger--bull'
  if (id === 'bear') return 'holdings-scenario-trigger--bear'
  if (id === 'base') return ''
  return 'holdings-scenario-trigger--custom'
}

export type MarketScenarioSelectorProps = {
  value: MarketScenarioId
  onChange: (id: MarketScenarioId) => void
  className?: string
}

/** Desktop row of pill buttons for macro market scenario selection. */
export function MarketScenarioButtonGroup({
  value,
  onChange,
  className = '',
}: MarketScenarioSelectorProps) {
  return (
    <div
      className={['market-scenario-button-group', className].filter(Boolean).join(' ')}
    >
      <div className="market-scenario-button-group__controls">
        <span className="market-scenario-button-group__label">Scenario:</span>
        <ModeButtonGroup
          value={value}
          options={MARKET_SCENARIO_BUTTON_OPTIONS}
          onChange={onChange}
          ariaLabel="Market scenario"
        />
      </div>
      <p className="market-scenario-button-group__note">{MARKET_SCENARIO_ILLUSTRATIVE_NOTE}</p>
    </div>
  )
}

/** Macro market scenario control — matches portfolio row scenario badge styling. */
export function MarketScenarioSelector({ value, onChange, className = '' }: MarketScenarioSelectorProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(rootRef, close, open)

  const active = getMarketScenarioDefinition(value)
  const showDot = value !== 'base'

  return (
    <div
      ref={rootRef}
      className={['market-scenario-selector', className].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={[
          'holdings-scenario-trigger',
          'holdings-scenario-trigger--badge',
          'market-scenario-selector__trigger',
          marketScenarioTriggerClass(value),
          open && 'market-scenario-selector__trigger--open',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby="market-scenario-selector-label"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="holdings-scenario-trigger__text">
          <span className="holdings-scenario-trigger__sublabel" id="market-scenario-selector-label">
            {MARKET_SCENARIO_SUBLABEL}
          </span>
          <span className="holdings-scenario-trigger__label-row">
            {showDot ? <span className="holdings-scenario-trigger__dot" aria-hidden /> : null}
            <span className="holdings-scenario-trigger__label">{active.label}</span>
            <span className="holdings-scenario-trigger__trail" aria-hidden>
              <IconChevronDown size={14} stroke={1.5} />
            </span>
          </span>
        </span>
      </button>
      <p className="market-scenario-selector__note">{MARKET_SCENARIO_ILLUSTRATIVE_NOTE}</p>
      {open ? (
        <ul
          className="market-scenario-selector__menu"
          role="listbox"
          aria-labelledby="market-scenario-selector-label"
        >
          {MARKET_SCENARIOS.map((scenario) => {
            const selected = scenario.id === value
            return (
              <li key={scenario.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={[
                    'market-scenario-selector__option',
                    selected && 'market-scenario-selector__option--selected',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    onChange(scenario.id)
                    setOpen(false)
                  }}
                >
                  <span className="market-scenario-selector__option-text">
                    <span className="market-scenario-selector__option-label">{scenario.label}</span>
                    <span className="market-scenario-selector__option-desc">{scenario.description}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
