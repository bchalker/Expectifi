import { useMemo } from 'react'
import type { AccountIncomeMonthlyContext } from '../lib/accountIncomeMonthly'
import { resolveAccountBucketBalancesFromIncomeLines } from '../lib/accountIncomeMonthly'
import type { ComputedSnapshot } from '../lib/computeResults'
import { useUserLocale } from '../context/UserLocaleContext'
import {
  buildHarvestTaxCallouts,
  buildHarvestTaxPictureNarrative,
  buildHarvestWithdrawalOrder,
  harvestTaxIncomeReady,
  ROTH_CONVERSION_CALLOUT_TOOLTIP,
  TAX_BREAKDOWN_EMPTY_GUIDANCE,
} from '../lib/taxBreakdownHarvest'
import { useTaxSummaryPanelOptional } from '../context/TaxSummaryPanelContext'
import { Tooltip } from './Tooltip'
import { TaxBreakdownTaxPictureBody } from './TaxBreakdownTaxPictureBody'
import './IncomeAccordionTerm.scss'

type Props = {
  c: ComputedSnapshot
  accountIncomeContext: AccountIncomeMonthlyContext
  onOpenSocialSecurity?: () => void
}

export function TaxBreakdownHarvestContent({
  c,
  accountIncomeContext,
  onOpenSocialSecurity,
}: Props) {
  const taxPanel = useTaxSummaryPanelOptional()
  const { locale, taxConfig } = useUserLocale()

  const accountBalances = useMemo(
    () => resolveAccountBucketBalancesFromIncomeLines(accountIncomeContext),
    [accountIncomeContext],
  )

  const taxPicture = useMemo(
    () => buildHarvestTaxPictureNarrative(c, taxConfig),
    [c, taxConfig],
  )
  const withdrawalOrder = useMemo(
    () => buildHarvestWithdrawalOrder(c, accountBalances, taxConfig, locale),
    [c, accountBalances, taxConfig, locale],
  )
  const callouts = useMemo(
    () => buildHarvestTaxCallouts(c, accountBalances),
    [c, accountBalances],
  )
  const incomeReady = harvestTaxIncomeReady(c)

  return (
    <div className="tax-breakdown-harvest">
      <section className="tax-breakdown-harvest__section">
        <h3 className="tax-breakdown-harvest__title">Your tax picture</h3>
        {incomeReady && taxPicture ? (
          <TaxBreakdownTaxPictureBody narrative={taxPicture} />
        ) : (
          <p className="tax-breakdown-harvest__body">{TAX_BREAKDOWN_EMPTY_GUIDANCE}</p>
        )}
      </section>

      <section className="tax-breakdown-harvest__section">
        <h3 className="tax-breakdown-harvest__title">Recommended withdrawal order</h3>
        {withdrawalOrder.length > 0 ? (
          <ol className="tax-breakdown-harvest__order-list">
            {withdrawalOrder.map((item, index) => (
              <li key={item.bucket} className="tax-breakdown-harvest__order-item">
                <div className="tax-breakdown-harvest__order-row">
                  <span className="tax-breakdown-harvest__order-index">{index + 1}</span>
                  <span className="tax-breakdown-harvest__order-label">{item.label}</span>
                </div>
                <span className="tax-breakdown-harvest__order-detail">{item.explanation}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="tax-breakdown-harvest__body">
            Add account balances to see a recommended withdrawal sequence for your portfolio.
          </p>
        )}
      </section>

      <section className="tax-breakdown-harvest__section tax-breakdown-harvest__section--last">
        <h3 className="tax-breakdown-harvest__title">Things to watch</h3>
        {callouts.length > 0 ? (
          <ul className="tax-breakdown-harvest__callout-list">
            {callouts.map((callout) => (
              <li key={callout.id} className="tax-breakdown-harvest__callout-item">
                <strong className="tax-breakdown-harvest__callout-label">
                  {callout.label}
                </strong>
                {callout.id === 'pretax-heavy' ? (
                  <span className="tax-breakdown-harvest__callout-body">
                    Consider gradual Roth{' '}
                    <Tooltip
                      content={ROTH_CONVERSION_CALLOUT_TOOLTIP}
                      placement="bottom"
                      showArrow
                      delay={200}
                      closeDelay={60}
                      contentClassName="tax-breakdown-harvest__roth-tooltip"
                    >
                      <span className="income-accordion-term">conversions</span>
                    </Tooltip>{' '}
                    in lower-income years before retirement.
                  </span>
                ) : (
                  <span className="tax-breakdown-harvest__callout-body">{callout.body}</span>
                )}
                {callout.id === 'ss-not-modeled' && onOpenSocialSecurity ? (
                  <button
                    type="button"
                    className="tax-breakdown-harvest__callout-link"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      taxPanel?.closePanel()
                      onOpenSocialSecurity()
                    }}
                  >
                    Add Social Security →
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="tax-breakdown-harvest__body">
            No major tax flags based on your current account mix — keep strategies updated as
            your plan evolves.
          </p>
        )}
      </section>
    </div>
  )
}
