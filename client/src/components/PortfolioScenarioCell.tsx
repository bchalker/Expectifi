import type { HoldingReturnRateSource } from '../lib/accountReturnScenario'
import {
  ACCOUNT_SCENARIO_SUBLABEL,
  HOLDING_ROW_SCENARIO_SUBLABEL,
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import {
  HoldingsScenarioTrigger,
  type HoldingsScenarioTriggerVariant,
} from './HoldingsScenarioTrigger'
import './PortfolioScenarioCell.scss'

export type PortfolioScenarioCellProps = {
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  /** Account scenario color when a holding follows the account scenario (outline). */
  inheritAccent?: ScenarioUiChoice | null
  /** Holding rows: whether return rate follows account vs custom override. */
  rateSource?: HoldingReturnRateSource
  rowActive: boolean
  onOpen: () => void
  layout: 'account' | 'holding'
  className?: string
}

/**
 * Shared scenario column for portfolio account rows and holding rows.
 */
export function PortfolioScenarioCell({
  label,
  common,
  variant,
  inheritAccent: _inheritAccent = null,
  rateSource,
  rowActive,
  onOpen,
  layout,
  className = '',
}: PortfolioScenarioCellProps) {
  const inheritsAccountScenario =
    layout === 'holding' && rateSource === 'account' && variant === 'outline'
  const holdingScenarioActive = layout === 'holding' && variant === 'badge'

  return (
    <div
      className={[
        'portfolio-scenario-cell',
        `portfolio-scenario-cell--${layout}`,
        layout === 'account' && rowActive && 'portfolio-scenario-cell--account-active',
        inheritsAccountScenario && 'portfolio-scenario-cell--inherits-account',
        holdingScenarioActive && 'portfolio-scenario-cell--holding-active',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <HoldingsScenarioTrigger
        label={label}
        common={common}
        variant={variant}
        inheritAccent={null}
        rowActive={rowActive}
        onOpen={onOpen}
        sublabel={
          layout === 'holding' ? HOLDING_ROW_SCENARIO_SUBLABEL : ACCOUNT_SCENARIO_SUBLABEL
        }
        className="portfolio-scenario-cell__trigger"
      />
    </div>
  )
}
