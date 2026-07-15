import type { ReactNode } from 'react'
import { SCENARIO_MIXED, type ScenarioUiChoice } from '../lib/holdingScenarioApply'
import type { AccountScenarioBucketId } from '../lib/accountReturnScenario'
import type { BucketTrendDisplay } from '../lib/bucketHoldingTrend'
import type { HoldingsScenarioTriggerVariant } from './HoldingsScenarioTrigger'
import { PortfolioScenarioCell } from './PortfolioScenarioCell'
import { BucketTotalTrend } from './ui/BucketTotalTrend'
import { ViewHoldingsHint } from './ui/ViewHoldingsHint'
import './PortfolioBucketAccountRow.scss'

export type PortfolioBucketAccountScenarioProps = {
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  bucket: AccountScenarioBucketId
  accountName: string
  triggerId?: string
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
  /**
   * Growth dashboard: name + desc in one column, amount beside scenario.
   * Income rows leave this off (name + values share a row).
   */
  amountBesideScenario?: boolean
  /** Income mode: identity column | values column | chevron. */
  incomeSummary?: boolean
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
  amountBesideScenario = false,
  incomeSummary = false,
}: Props) {
  const showScenario = Boolean(scenario)
  const showActionSlot = Boolean(actionSlot)
  const showHintStack = Boolean(subtext || withdrawalPill)
  const valuesBesideIdentity = amountBesideScenario || incomeSummary

  const nameGroup = (
    <div className="portfolio-bucket-account-row__name-group">
      {badgeOrder != null ? (
        <span className="portfolio-bucket-account-row__order-badge-wrap">
          <span className="portfolio-bucket-account-row__order-badge">{badgeOrder}</span>
        </span>
      ) : null}
      <span className="portfolio-bucket-account-row__name">{label}</span>
    </div>
  )

  const hintStack = showHintStack ? (
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
  ) : null

  const valuesColumn = (
    <div className="portfolio-bucket-account-row__values">
      <div className="portfolio-bucket-account-row__values-row">
        <div className="portfolio-bucket-account-row__total">{total}</div>
      </div>
      {valuesExtra ? (
        <div className="portfolio-bucket-account-row__values-extra">{valuesExtra}</div>
      ) : null}
    </div>
  )

  const scenarioSlot = showActionSlot ? (
    <div className="portfolio-bucket-account-row__scenario">{actionSlot}</div>
  ) : showScenario ? (
    <div className="portfolio-bucket-account-row__scenario">
      <PortfolioScenarioCell layout="account" {...scenario!} />
    </div>
  ) : null

  const chevronHint = showViewHoldings ? (
    <ViewHoldingsHint className="portfolio-bucket-account-row__chevron" />
  ) : null

  const scenarioColumn =
    amountBesideScenario && scenarioSlot ? (
      <div className="portfolio-bucket-account-row__actions portfolio-bucket-account-row__actions--scenario-only">
        {scenarioSlot}
      </div>
    ) : null

  const bundledActionsColumn =
    !amountBesideScenario && (scenarioSlot || chevronHint) ? (
      <div className="portfolio-bucket-account-row__actions">
        {scenarioSlot}
        {chevronHint}
      </div>
    ) : null

  return (
    <div
      className={[
        'portfolio-bucket-account-row',
        amountBesideScenario && 'portfolio-bucket-account-row--amount-beside-scenario',
        incomeSummary && 'portfolio-bucket-account-row--income-summary',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="portfolio-bucket-account-row__summary-row">
        <div className="portfolio-bucket-account-row__header-row">
          <div className="portfolio-bucket-account-row__content">
            <div className="portfolio-bucket-account-row__main">
              <div className="portfolio-bucket-account-row__identity">
                {incomeSummary ? (
                  <div className="portfolio-bucket-account-row__identity-col">
                    {nameGroup}
                    {hintStack}
                  </div>
                ) : (
                  <div
                    className={[
                      'portfolio-bucket-account-row__title-row',
                      showHintStack && 'portfolio-bucket-account-row__title-row--stacked-hint',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {nameGroup}
                    {!valuesBesideIdentity ? valuesColumn : null}
                    {hintStack}
                  </div>
                )}
                {identityExtra ? (
                  <div className="portfolio-bucket-account-row__identity-extra">{identityExtra}</div>
                ) : null}
                <BucketTotalTrend trend={trend} className="portfolio-bucket-account-row__trend" />
              </div>
            </div>
          </div>
          {scenarioColumn}
          {valuesBesideIdentity ? valuesColumn : null}
          {amountBesideScenario ? chevronHint : null}
          {bundledActionsColumn}
        </div>
        {allocationSlot ? (
          <div className="portfolio-bucket-account-row__allocation-row">{allocationSlot}</div>
        ) : null}
      </div>
    </div>
  )
}
