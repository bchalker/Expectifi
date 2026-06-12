import type { AccountScenarioBucketId, HoldingReturnRateSource } from '../lib/accountReturnScenario'
import {
  HOLDING_ROW_SCENARIO_SUBLABEL,
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import { useScenarioPopout } from '../context/ScenarioPopoutContext'
import {
  HoldingsScenarioTrigger,
  type HoldingsScenarioTriggerVariant,
} from './HoldingsScenarioTrigger'
import { AccountScenarioRowPopout } from './accountScenario/AccountScenarioRowPopout'
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
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  inheritAccent?: ScenarioUiChoice | null
  rateSource?: HoldingReturnRateSource
  overridesAccountScenario?: boolean
  rowActive: boolean
  onOpen: () => void
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
  const { isAccountScenarioOpen } = useScenarioPopout()

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
    label,
    common,
    variant,
    inheritAccent = null,
    rateSource,
    overridesAccountScenario = false,
    rowActive,
    onOpen,
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
        rowActive && 'portfolio-scenario-cell--holding-active',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="portfolio-scenario-cell__stack">
        <HoldingsScenarioTrigger
          label={label}
          common={common}
          variant={variant}
          inheritAccent={inheritAccent}
          rowActive={rowActive}
          onOpen={onOpen}
          sublabel={
            HOLDING_ROW_SCENARIO_SUBLABEL
          }
          className="portfolio-scenario-cell__trigger"
        />
        {overridesAccountScenario ? (
          <span className="portfolio-scenario-cell__override-note">Overrides account scenario</span>
        ) : null}
      </div>
    </div>
  )
}
