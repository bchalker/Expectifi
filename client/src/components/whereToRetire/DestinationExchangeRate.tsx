import { useMemo, type CSSProperties } from 'react'
import {
  IconArrowsExchange,
} from '@tabler/icons-react'
import {
  formatUsdToLocalAmount,
  formatUsdToLocalRate,
} from '../../lib/api/exchangeRates'
import { useDestinationLiveData } from '../../hooks/useDestinationLiveData'
import { countryToCurrencyCode, type MapCity } from '../../utils/costOfLiving'
import { fmt } from '../../utils/format'
import { Tooltip } from '../Tooltip'
import {
  DOLLAR_STRENGTH_LABELS,
  dollarStrengthBand,
  purchasingPowerMultiplierForCity,
} from './cityDetail/cityDetailTabUtils'
import './DestinationExchangeRate.scss'
import '../Tooltip.scss'

type Props = {
  city: MapCity
  /** Expectifi projected monthly income — not the exploration slider value. */
  planMonthlyIncome?: number
  variant?: 'card' | 'compact'
  className?: string
  staggerClassName?: string
  staggerStyle?: (index: number) => CSSProperties
}

function staggerProps(
  staggerClassName: string | undefined,
  staggerStyle: ((index: number) => CSSProperties) | undefined,
  index: number,
  baseClass?: string,
): { className?: string; style?: CSSProperties } {
  if (!staggerClassName || !staggerStyle) {
    return baseClass ? { className: baseClass } : {}
  }
  return {
    className: baseClass ? `${baseClass} ${staggerClassName}` : staggerClassName,
    style: staggerStyle(index),
  }
}

function formatPurchasingPowerMultiplier(multiplier: number): string {
  const rounded = Number(multiplier.toFixed(1))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export function DestinationExchangeRate({
  city,
  planMonthlyIncome = 0,
  variant = 'card',
  className,
  staggerClassName,
  staggerStyle,
}: Props) {
  const { currency, loading } = useDestinationLiveData(city)
  const currencyCode = countryToCurrencyCode(city.country)
  const isUsd = !currencyCode || currencyCode === 'USD'

  const purchasingMeta = useMemo(() => {
    const multiplier = purchasingPowerMultiplierForCity(city)
    if (multiplier == null || multiplier <= 0) return null
    const band = dollarStrengthBand(multiplier)
    return { multiplier, band }
  }, [city.id])

  const rootClass = [
    'wtr-exchange-rate',
    `wtr-exchange-rate--${variant}`,
    isUsd && 'wtr-exchange-rate--usd',
    loading && 'wtr-exchange-rate--loading',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (isUsd) {
    if (variant === 'compact') {
      return (
        <p className={rootClass} {...staggerProps(staggerClassName, staggerStyle, 0)}>
          Budget in USD
        </p>
      )
    }
    return (
      <section className={rootClass} {...staggerProps(staggerClassName, staggerStyle, 0)}>
        <p className="wtr-exchange-rate__copy">
          Prices and budget estimates are in US dollars. This destination uses the US dollar.
        </p>
        {planMonthlyIncome > 0 ? (
          <p className="wtr-exchange-rate__income-rate tabular-nums">
            {fmt(planMonthlyIncome)}/mo budget in USD
          </p>
        ) : null}
      </section>
    )
  }

  if (loading) {
    return (
      <section className={rootClass} aria-busy="true" {...staggerProps(staggerClassName, staggerStyle, 0)}>
        <p className="wtr-exchange-rate__copy">Loading exchange rate…</p>
      </section>
    )
  }

  if (!currency) {
    return (
      <section className={rootClass} {...staggerProps(staggerClassName, staggerStyle, 0)}>
        <p className="wtr-exchange-rate__copy">Exchange rate unavailable for this destination.</p>
      </section>
    )
  }

  const rateLabel = `1 USD ≈ ${formatUsdToLocalRate(currency.rate, currency.currencyCode)} ${currency.currencyCode}`
  const localMonthlyIncome =
    planMonthlyIncome > 0
      ? planMonthlyIncome * currency.rate
      : null
  const incomeLabel =
    localMonthlyIncome != null
      ? `${fmt(planMonthlyIncome)} ≈ ${formatUsdToLocalAmount(localMonthlyIncome, currency.currencyCode)} ${currency.currencyCode}`
      : null
  const wiseTransferUrl = `https://wise.com/send/?sourceCurrency=USD&targetCurrency=${encodeURIComponent(currency.currencyCode)}`

  if (variant === 'compact') {
    return (
      <p className={rootClass} {...staggerProps(staggerClassName, staggerStyle, 0)}>
        <IconArrowsExchange size={14} stroke={1.5} aria-hidden className="wtr-exchange-rate__compact-icon" />
        <span className="tabular-nums">{rateLabel}</span>
      </p>
    )
  }

  return (
    <section className={rootClass} aria-label="Exchange rate vs US dollar" {...staggerProps(staggerClassName, staggerStyle, 0)}>
      <div className="wtr-exchange-rate__top">
        <div className="wtr-exchange-rate__rates">
          <p className="wtr-exchange-rate__rate-row">
            <Tooltip
              placement="top"
              showArrow
              delay={250}
              closeDelay={80}
              content={
                <>
                  Mid-market rate from Wise, updated frequently.
                  <br />
                  Illustrative only — not a transfer quote.
                  {currency.source === 'wise' ? (
                    <>
                      <br />
                      <a
                        href={wiseTransferUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wtr-exchange-rate__wise-link"
                      >
                        Send with Wise
                      </a>
                    </>
                  ) : null}
                </>
              }
            >
              <span className="wtr-exchange-rate__spot-rate tabular-nums">{rateLabel}</span>
            </Tooltip>
          </p>
          {incomeLabel ? (
            <p className="wtr-exchange-rate__income-rate tabular-nums">{incomeLabel}</p>
          ) : null}
        </div>
        {purchasingMeta ? (
          <Tooltip
            placement="top"
            showArrow
            delay={250}
            closeDelay={80}
            content={
              <>
                Living-cost comparison for {city.city} vs a typical US city in our data.
                <br />
                The exchange rate above is the same for all countries using {currency.currencyCode}.
              </>
            }
          >
            <span
              className={[
                'wtr-exchange-rate__power-badge',
                `wtr-exchange-rate__power-badge--${purchasingMeta.band}`,
              ].join(' ')}
            >
              {formatPurchasingPowerMultiplier(purchasingMeta.multiplier)}x your US purchasing power
            </span>
          </Tooltip>
        ) : null}
      </div>
      <div className="wtr-exchange-rate__footer">
        <p className="wtr-exchange-rate__attribution">
          {currency.currencyName}
          {currency.source === 'wise' ? (
            <>
              {' · '}
              <span className="wtr-exchange-rate__attribution-source">
                Rates provided via{' '}
                <a
                  href={wiseTransferUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wtr-exchange-rate__wise-link"
                >
                  Wise
                </a>
              </span>
            </>
          ) : null}
        </p>
        {purchasingMeta ? (
          <span
            className={[
              'wtr-exchange-rate__strength-label',
              `wtr-exchange-rate__strength-label--${purchasingMeta.band}`,
            ].join(' ')}
          >
            {DOLLAR_STRENGTH_LABELS[purchasingMeta.band]}
          </span>
        ) : null}
      </div>
    </section>
  )
}
