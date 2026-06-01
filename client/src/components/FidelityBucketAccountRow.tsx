import type { ReactNode } from 'react'
import { SCENARIO_MIXED, type ScenarioUiChoice } from '../lib/holdingScenarioApply'
import type { BucketTrendDisplay } from '../lib/bucketHoldingTrend'
import { PortfolioScenarioCell } from './PortfolioScenarioCell'
import { BucketTotalTrend } from './ui/BucketTotalTrend'
import { ViewHoldingsHint } from './ui/ViewHoldingsHint'
import type { HoldingsScenarioTriggerVariant } from './HoldingsScenarioTrigger'
import './FidelityBucketAccountRow.scss'

export type FidelityBucketAccountScenarioProps = {
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  rowActive: boolean
  onOpen: () => void
}

type Props = {
  label: string
  /** Tax treatment line under the account name. */
  subtext?: string | null
  total: ReactNode
  trend?: BucketTrendDisplay | null
  showViewHoldings?: boolean
  /** Withdrawal-order index badge (1, 2, …) when withdrawal guidance is on. */
  badgeOrder?: number | null
  scenario?: FidelityBucketAccountScenarioProps | null
}

/** Portfolio account summary row: order count, name + tax subtext, total, scenario, chevron. */
export function FidelityBucketAccountRow({
  label,
  subtext = null,
  total,
  trend,
  showViewHoldings = true,
  badgeOrder = null,
  scenario = null,
}: Props) {
  const showScenario = Boolean(scenario)

  return (
    <div className="portfolio-bucket-account-row">
      <div className="portfolio-bucket-account-row__summary-row">
        <div className="portfolio-bucket-account-row__content">
          <div className="portfolio-bucket-account-row__main">
            {badgeOrder != null ? (
              <span className="portfolio-bucket-account-row__order-badge-wrap">
                <span className="portfolio-bucket-account-row__order-badge">{badgeOrder}</span>
              </span>
            ) : null}
            <div className="portfolio-bucket-account-row__identity">
              <span className="portfolio-bucket-account-row__name">{label}</span>
              {subtext ? (
                <span className="portfolio-bucket-account-row__subtext">{subtext}</span>
              ) : null}
              <BucketTotalTrend trend={trend} className="portfolio-bucket-account-row__trend" />
            </div>
          </div>
          <div className="portfolio-bucket-account-row__values">
            <span className="portfolio-bucket-account-row__total">{total}</span>
          </div>
        </div>
        {showScenario || showViewHoldings ? (
          <div className="portfolio-bucket-account-row__actions">
            {showScenario ? (
              <div className="portfolio-bucket-account-row__scenario">
                <PortfolioScenarioCell layout="account" {...scenario!} />
              </div>
            ) : null}
            {showViewHoldings ? (
              <ViewHoldingsHint className="portfolio-bucket-account-row__chevron" />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
