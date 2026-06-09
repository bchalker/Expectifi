import { useEffect, useMemo } from 'react'
import type { CalculatorInputs, ComputedSnapshot } from '../lib/computeResults'
import { useUserLocale } from '../context/UserLocaleContext'
import {
  buildForecastContributionOrder,
  buildForecastTaxCallouts,
  buildForecastTaxPictureNarrative,
  buildForecastTaxRawInputs,
  calcForecastGrowthTaxDetail,
  forecastTaxGrowthReady,
  FORECAST_TAX_EMPTY_GUIDANCE,
  logForecastTaxBreakdownRawInputs,
} from '../lib/taxBreakdownForecast'
import { TaxBreakdownTaxPictureBody } from './TaxBreakdownTaxPictureBody'

type Props = {
  c: ComputedSnapshot
  inputs: CalculatorInputs
  /** Whether computeResults ran with income-mode tax path (should be false on growth dashboard). */
  incomeModeFlag?: boolean
}

export function TaxBreakdownForecastContent({ c, inputs, incomeModeFlag = false }: Props) {
  const { locale, taxConfig } = useUserLocale()

  const rawInputs = useMemo(
    () => buildForecastTaxRawInputs(c, inputs, incomeModeFlag),
    [c, inputs, incomeModeFlag],
  )

  useEffect(() => {
    logForecastTaxBreakdownRawInputs(rawInputs)
  }, [rawInputs])

  const growthTaxDetail = useMemo(
    () => calcForecastGrowthTaxDetail(c, inputs),
    [c, inputs],
  )

  const taxPicture = useMemo(
    () => buildForecastTaxPictureNarrative(c, inputs, taxConfig),
    [c, inputs, taxConfig],
  )

  const contributionOrder = useMemo(
    () => buildForecastContributionOrder(c, taxConfig, locale),
    [c, taxConfig, locale],
  )

  const callouts = useMemo(
    () => buildForecastTaxCallouts(c, inputs, taxConfig),
    [c, inputs, taxConfig],
  )

  const growthReady = forecastTaxGrowthReady(c)

  if (import.meta.env.DEV) {
    console.info('[Forecast Tax Breakdown] growth tax model output', growthTaxDetail)
  }

  return (
    <div className="tax-breakdown-harvest">
      <section className="tax-breakdown-harvest__section">
        <h3 className="tax-breakdown-harvest__title">Your tax picture</h3>
        {growthReady && taxPicture ? (
          <TaxBreakdownTaxPictureBody narrative={taxPicture} />
        ) : (
          <p className="tax-breakdown-harvest__body">{FORECAST_TAX_EMPTY_GUIDANCE}</p>
        )}
      </section>

      <section className="tax-breakdown-harvest__section">
        <h3 className="tax-breakdown-harvest__title">Recommended contribution order</h3>
        {contributionOrder.length > 0 ? (
          <ol className="tax-breakdown-harvest__order-list">
            {contributionOrder.map((item, index) => (
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
            Add account balances to see a tax-efficient contribution sequence.
          </p>
        )}
      </section>

      <section className="tax-breakdown-harvest__section tax-breakdown-harvest__section--last">
        <h3 className="tax-breakdown-harvest__title">Things to watch</h3>
        {callouts.length > 0 ? (
          <ul className="tax-breakdown-harvest__callout-list">
            {callouts.map((callout) => (
              <li key={callout.id} className="tax-breakdown-harvest__callout-item">
                <strong className="tax-breakdown-harvest__callout-label">{callout.label}</strong>
                <span className="tax-breakdown-harvest__callout-body">{callout.body}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tax-breakdown-harvest__body">
            No major accumulation-phase tax flags based on your current mix — keep funding
            tax-advantaged accounts first.
          </p>
        )}
      </section>
    </div>
  )
}
