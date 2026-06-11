import { useMemo, type CSSProperties } from 'react'
import {
  IconArrowsExchange,
  IconCoin,
  IconMinus,
  IconTrendingDown,
  IconTrendingUp,
} from '@tabler/icons-react'
import { formatUsdToLocalRate } from '../../lib/api/exchangeRates'
import { useDestinationLiveData } from '../../hooks/useDestinationLiveData'
import { countryToCurrencyCode, type MapCity } from '../../utils/costOfLiving'
import { Tooltip } from '../Tooltip'
import {
  DOLLAR_STRENGTH_LABELS,
  dollarStrengthBand,
  getColIndexForCountry,
  usPurchasingPowerMultiplier,
  type DollarStrengthBand,
} from './cityDetail/cityDetailTabUtils'
import './DestinationExchangeRate.scss'
import '../Tooltip.scss'

type Props = {
  city: MapCity
  variant?: 'card' | 'compact'
  className?: string
  staggerClassName?: string
  staggerStyle?: (index: number) => CSSProperties
}

const STRENGTH_ICONS: Record<DollarStrengthBand, typeof IconTrendingUp> = {
  strong: IconTrendingUp,
  moderate: IconMinus,
  weak: IconTrendingDown,
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

  const purchasingMeta = useMemo(() => {
    const colIndex = getColIndexForCountry(city.country)
    if (colIndex == null || colIndex <= 0) return null
    const multiplier = usPurchasingPowerMultiplier(colIndex)
    const band = dollarStrengthBand(multiplier)
    return { multiplier, band }
  }, [city.country])

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
        <IconArrowsExchange size={14} stroke={1.5} aria-hidden className="wtr-exchange-rate__compact-icon" />
        <span className="tabular-nums">{rateLabel}</span>
      </p>
    )
  }

  const StrengthIcon = purchasingMeta ? STRENGTH_ICONS[purchasingMeta.band] : null

  return (
    <section className={rootClass} aria-label="Exchange rate vs US dollar" {...staggerProps(staggerClassName, staggerStyle, 0)}>
      <div className="wtr-exchange-rate__layout">
        <div className="wtr-exchange-rate__primary">
          <p className="wtr-exchange-rate__rate-row">
            <IconArrowsExchange size={18} stroke={1.5} aria-hidden />
            <Tooltip
              placement="top"
              showArrow
              delay={250}
              closeDelay={80}
              content={
                <>
                  Spot rate, updated daily.
                  <br />
                  Not a quote for transfers.
                </>
              }
            >
              <span className="wtr-exchange-rate__rate tabular-nums">{rateLabel}</span>
            </Tooltip>
          </p>
          <p className="wtr-exchange-rate__currency-name">{currency.currencyName}</p>
        </div>
        {purchasingMeta && StrengthIcon ? (
          <div className="wtr-exchange-rate__meta">
            <span
              className={[
                'wtr-exchange-rate__strength-badge',
                `wtr-exchange-rate__strength-badge--${purchasingMeta.band}`,
              ].join(' ')}
            >
              <StrengthIcon size={14} stroke={1.5} aria-hidden />
              {DOLLAR_STRENGTH_LABELS[purchasingMeta.band]}
            </span>
            <span className="wtr-exchange-rate__purchasing-pill">
              <IconCoin size={14} stroke={1.5} aria-hidden />
              <span className="tabular-nums">
                {purchasingMeta.multiplier}× your US purchasing power
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}
