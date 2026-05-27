import type { HoldingReturnRateSource } from '../lib/accountReturnScenario'
import {
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

function portfolioScenarioCellAccentClass(choice: ScenarioUiChoice | 'outline'): string {
  if (choice === 'outline') return 'portfolio-scenario-cell--accent-outline'
  if (choice === 'base') return 'portfolio-scenario-cell--accent-normal'
  return `portfolio-scenario-cell--accent-${choice}`
}

function portfolioScenarioCellStateClass(
  layout: 'account' | 'holding',
  variant: HoldingsScenarioTriggerVariant,
  common: ScenarioUiChoice | typeof SCENARIO_MIXED,
  inheritAccent: ScenarioUiChoice | null | undefined,
  rateSource: HoldingReturnRateSource | undefined,
): string {
  if (layout === 'holding') {
    if (variant === 'badge' || rateSource === 'custom') {
      return ''
    }
    if (
      rateSource === 'account' &&
      inheritAccent &&
      inheritAccent !== 'default'
    ) {
      return portfolioScenarioCellAccentClass(inheritAccent)
    }
    return ''
  }

  if (variant === 'badge' && common !== 'default' && common !== SCENARIO_MIXED) {
    return portfolioScenarioCellAccentClass(common)
  }
  if (variant === 'outline') {
    if (inheritAccent && inheritAccent !== 'default') {
      return portfolioScenarioCellAccentClass(inheritAccent)
    }
    if (layout === 'account' && common === 'default') {
      return ''
    }
    return portfolioScenarioCellAccentClass('outline')
  }
  return ''
}

/**
 * Shared scenario column for portfolio account rows and holding rows —
 * same trigger, width, and per-scenario left accent as the account header.
 */
export function PortfolioScenarioCell({
  label,
  common,
  variant,
  inheritAccent = null,
  rateSource,
  rowActive,
  onOpen,
  layout,
  className = '',
}: PortfolioScenarioCellProps) {
  const inheritsAccountScenario =
    layout === 'holding' && rateSource === 'account' && variant === 'outline'
  const holdingScenarioActive = layout === 'holding' && variant === 'badge'
  const stateClass = portfolioScenarioCellStateClass(
    layout,
    variant,
    common,
    inheritAccent,
    rateSource,
  )

  return (
    <div
      className={[
        'portfolio-scenario-cell',
        `portfolio-scenario-cell--${layout}`,
        layout === 'account' && variant === 'badge' && 'portfolio-scenario-cell--account-active',
        inheritsAccountScenario && 'portfolio-scenario-cell--inherits-account',
        holdingScenarioActive && 'portfolio-scenario-cell--holding-active',
        stateClass,
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
        className="portfolio-scenario-cell__trigger"
      />
    </div>
  )
}
