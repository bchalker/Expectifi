import type { ReactNode } from 'react'
import { SCENARIO_MIXED, type ScenarioUiChoice } from '../lib/holdingScenarioApply'
import type { BucketTrendDisplay } from '../lib/bucketHoldingTrend'
import { PortfolioScenarioCell } from './PortfolioScenarioCell'
import { BucketTotalTrend } from './ui/BucketTotalTrend'
import { ViewHoldingsHint } from './ui/ViewHoldingsHint'
import type { HoldingsScenarioTriggerVariant } from './HoldingsScenarioTrigger'
import './PortfolioBucketAccountRow.scss'

export type PortfolioBucketAccountScenarioProps = {
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  rowActive: boolean
  onOpen: () => void
}

type Props = {
  label: string
  /** Personalized hint or tax line under the account name. */
  subtext?: ReactNode | null
  /** Income mode: annual withdrawal stat beneath the hint. */
  withdrawalPill?: ReactNode | null
  /** Manual rows: allocation profile select below account hint (dashed divider). */
  allocationSlot?: ReactNode | null
  total: ReactNode
  trend?: BucketTrendDisplay | null
  showViewHoldings?: boolean
  /** Withdrawal-order index badge (1, 2, …) when withdrawal guidance is on. */
  badgeOrder?: number | null
  /** Content below name/hint (e.g. income strategy segment). */
  identityExtra?: ReactNode | null
  scenario?: PortfolioBucketAccountScenarioProps | null
  /** Income mode: dividend fund selector in the scenario column. */
  actionSlot?: ReactNode | null
  /** Extra figures under the total in the values column (income yield / monthly). */
  valuesExtra?: ReactNode | null
}

/** Portfolio account summary row: order count, name + tax subtext, total, scenario, chevron. */
export function PortfolioBucketAccountRow({
  label,
  subtext = null,
  withdrawalPill = null,
  allocationSlot = null,
  total,
  trend,
  showViewHoldings = true,
  badgeOrder = null,
  identityExtra = null,
  scenario = null,
  actionSlot = null,
  valuesExtra = null,
}: Props) {
  const showScenario = Boolean(scenario)
  const showActionSlot = Boolean(actionSlot)
  const showActionsColumn = showScenario || showActionSlot || showViewHoldings

  return (
    <div className="portfolio-bucket-account-row">
      <div className="portfolio-bucket-account-row__summary-row">
        <div className="portfolio-bucket-account-row__header-row">
          <div className="portfolio-bucket-account-row__content">
            <div className="portfolio-bucket-account-row__main">
              {badgeOrder != null ? (
                <span className="portfolio-bucket-account-row__order-badge-wrap">
                  <span className="portfolio-bucket-account-row__order-badge">{badgeOrder}</span>
                </span>
              ) : null}
              <div className="portfolio-bucket-account-row__identity">
                <span className="portfolio-bucket-account-row__name">{label}</span>
                {subtext || withdrawalPill ? (
                  <div className="portfolio-bucket-account-row__hint-stack">
                    {subtext ? (
                      typeof subtext === 'string' ? (
                        <span className="portfolio-bucket-account-row__subtext">{subtext}</span>
                      ) : (
                        subtext
                      )
                    ) : null}
                    {withdrawalPill}
                  </div>
                ) : null}
                {identityExtra ? (
                  <div className="portfolio-bucket-account-row__identity-extra">{identityExtra}</div>
                ) : null}
                <BucketTotalTrend trend={trend} className="portfolio-bucket-account-row__trend" />
              </div>
            </div>
            <div className="portfolio-bucket-account-row__values">
              <div className="portfolio-bucket-account-row__values-row">
                <div className="portfolio-bucket-account-row__total">{total}</div>
              </div>
              {valuesExtra ? (
                <div className="portfolio-bucket-account-row__values-extra">{valuesExtra}</div>
              ) : null}
            </div>
          </div>
          {showActionsColumn ? (
            <div className="portfolio-bucket-account-row__actions">
              {showActionSlot ? (
                <div className="portfolio-bucket-account-row__scenario">{actionSlot}</div>
              ) : showScenario ? (
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
        {allocationSlot ? (
          <div className="portfolio-bucket-account-row__allocation-row">{allocationSlot}</div>
        ) : null}
      </div>
    </div>
  )
}
