import { useEffect, useState } from 'react'
import type { LocalCurrencyInfo } from '../lib/api/exchangeRates'
import { getLocalCurrencyInfo, getUsdExchangeHistory } from '../lib/api/exchangeRates'
import { countryToCurrencyCode, type MapCity } from '../utils/costOfLiving'

type DestinationLiveData = {
  currency: LocalCurrencyInfo | null
  loading: boolean
}

export function useDestinationLiveData(city: MapCity | null): DestinationLiveData {
  const [currency, setCurrency] = useState<LocalCurrencyInfo | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!city) {
      setCurrency(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setCurrency(null)

    const currencyCode = countryToCurrencyCode(city.country)

    void (async () => {
      const nextCurrency =
        currencyCode && currencyCode !== 'USD'
          ? await getLocalCurrencyInfo(currencyCode)
          : null

      if (cancelled) return
      setCurrency(nextCurrency)
      setLoading(false)

      if (currencyCode && currencyCode !== 'USD') {
        void getUsdExchangeHistory(currencyCode)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [city?.id, city?.country])

  return { currency, loading }
}
