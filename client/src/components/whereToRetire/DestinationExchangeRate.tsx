import type { CSSProperties } from 'react'
import { IconArrowsExchange } from '@tabler/icons-react'
import { formatUsdToLocalRate } from '../../lib/api/exchangeRates'
import { useDestinationLiveData } from '../../hooks/useDestinationLiveData'
import { countryToCurrencyCode, type MapCity } from '../../utils/costOfLiving'
import './DestinationExchangeRate.scss'

const EXCHANGE_SOURCE_FOOTER =
  'Spot rate from open.er-api.com (refreshed about daily). For planning only — not a quote for transfers.'

type Props = {
  city: MapCity
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

export function DestinationExchangeRate({
  city,
  variant = 'card',
  className,
  staggerClassName,
  staggerStyle,
}: Props) {
  const { currency, loading } = useDestinationLiveData(city)
  const currencyCode = countryToCurrencyCode(city.country)
  const isUsd = !currencyCode || currencyCode === 'USD'

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

  if (variant === 'compact') {
    return (
      <p className={rootClass} {...staggerProps(staggerClassName, staggerStyle, 0)}>
        <span className="wtr-exchange-rate__compact-label">Exchange rate:</span>{' '}
        <span className="tabular-nums">{rateLabel}</span>
      </p>
    )
  }

  return (
    <section className={rootClass} aria-label="Exchange rate vs US dollar" {...staggerProps(staggerClassName, staggerStyle, 0)}>
      <header className="wtr-exchange-rate__head">
        <IconArrowsExchange size={18} stroke={1.5} aria-hidden />
        <h3 className="wtr-exchange-rate__title">Exchange rate</h3>
      </header>
      <p className="wtr-exchange-rate__rate tabular-nums">{rateLabel}</p>
      <p className="wtr-exchange-rate__currency-name">{currency.currencyName}</p>
      <p className="wtr-exchange-rate__footnote">{EXCHANGE_SOURCE_FOOTER}</p>
    </section>
  )
}
