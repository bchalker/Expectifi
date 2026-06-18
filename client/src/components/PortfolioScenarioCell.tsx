import type { AccountScenarioBucketId, HoldingReturnRateSource } from '../lib/accountReturnScenario'
import {
  HOLDING_ROW_SCENARIO_SUBLABEL,
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import type { ImportedPositionRow } from '../lib/positionsCsv'
import { useScenarioPopout } from '../context/ScenarioPopoutContext'
import { AccountScenarioRowPopout } from './accountScenario/AccountScenarioRowPopout'
import { HoldingScenarioRowPopout } from './holdingScenario/HoldingScenarioRowPopout'
import type { HoldingsScenarioTriggerVariant } from './HoldingsScenarioTrigger'
import './PortfolioScenarioCell.scss'

export type PortfolioScenarioCellAccountProps = {
  bucket: AccountScenarioBucketId
  accountName: string
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  triggerId?: string
}

export type PortfolioScenarioCellHoldingProps = {
  symbol: string
  scopeKey: string
  contributingRows: ImportedPositionRow[]
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  inheritAccent?: ScenarioUiChoice | null
  rateSource?: HoldingReturnRateSource
  overridesAccountScenario?: boolean
  triggerId?: string
}

export type PortfolioScenarioCellProps =
  | ({
      layout: 'account'
      className?: string
    } & PortfolioScenarioCellAccountProps)
  | ({
      layout: 'holding'
      className?: string
    } & PortfolioScenarioCellHoldingProps)

/**
 * Shared scenario column for portfolio account rows and holding rows.
 */
export function PortfolioScenarioCell(props: PortfolioScenarioCellProps) {
  const { isAccountScenarioOpen, isHoldingScenarioOpen } = useScenarioPopout()

  if (props.layout === 'account') {
    const {
      bucket,
      accountName,
      label,
      common,
      variant,
      triggerId,
      className = '',
    } = props
    return (
      <div
        className={[
          'portfolio-scenario-cell',
          'portfolio-scenario-cell--account',
          isAccountScenarioOpen(bucket) && 'portfolio-scenario-cell--account-active',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <AccountScenarioRowPopout
          bucket={bucket}
          accountName={accountName}
          label={label}
          common={common}
          variant={variant}
          triggerId={triggerId}
        />
      </div>
    )
  }

  const {
    symbol,
    scopeKey,
    contributingRows,
    label,
    common,
    variant,
    inheritAccent = null,
    rateSource,
    overridesAccountScenario = false,
    triggerId,
    className = '',
  } = props

  const inheritsAccountScenario =
    rateSource === 'account' && variant === 'outline'

  return (
    <div
      className={[
        'portfolio-scenario-cell',
        'portfolio-scenario-cell--holding',
        inheritsAccountScenario && 'portfolio-scenario-cell--inherits-account',
        isHoldingScenarioOpen(symbol, scopeKey) && 'portfolio-scenario-cell--holding-active',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <HoldingScenarioRowPopout
        symbol={symbol}
        scopeKey={scopeKey}
        contributingRows={contributingRows}
        label={label}
        common={common}
        variant={variant}
        inheritAccent={inheritAccent}
        overridesAccountScenario={overridesAccountScenario}
        triggerId={triggerId}
      />
    </div>
  )
}

export { HOLDING_ROW_SCENARIO_SUBLABEL }
