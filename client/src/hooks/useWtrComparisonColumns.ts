import { useEffect, useMemo, useState } from 'react'
import { getCityClimateForPlace } from '../lib/api/openMeteo'
import {
  formatUsdToLocalRate,
  getLocalCurrencyInfo,
  getUsdExchangeHistory,
} from '../lib/api/exchangeRates'
import {
  buildComparisonColumnData,
  type ComparisonColumnData,
} from '../lib/whereToRetire/comparisonTableModel'
import { scoreMapCity, type ScoredMapCity } from '../lib/whereToRetire/cityMapScoring'
import { countryToCurrencyCode, getAllMapCities, type MapCity } from '../utils/costOfLiving'

type ColumnBundle = {
  columns: ComparisonColumnData[]
  loading: boolean
}

export function useWtrComparisonColumns(
  compareScored: ScoredMapCity[],
  baselineCity: MapCity | null,
  monthlyIncome: number,
  modeledAge?: number,
): ColumnBundle {
  const [extras, setExtras] = useState<
    Record<string, { climate: ComparisonColumnData['climate']; fx: ComparisonColumnData['dollarStrength'] }>
  >({})
  const [currencyById, setCurrencyById] = useState<
    Record<string, { code: string; name: string; rateLabel: string }>
  >({})

  const allTargets = useMemo(() => {
    const list: MapCity[] = []
    if (baselineCity) list.push(baselineCity)
    for (const s of compareScored) {
      if (!list.some((c) => c.id === s.city.id)) list.push(s.city)
    }
    return list
  }, [baselineCity, compareScored])

  const targetKey = allTargets.map((c) => c.id).join('|')

  useEffect(() => {
    let cancelled = false
    if (!targetKey) {
      setExtras({})
      return
    }

    void (async () => {
      const next: typeof extras = {}
      await Promise.all(
        allTargets.map(async (city) => {
          const currencyCode = countryToCurrencyCode(city.country)
          const [climate, fx] = await Promise.all([
            getCityClimateForPlace(city.city, city.country, city.lat, city.lng),
            currencyCode && currencyCode !== 'USD'
              ? getUsdExchangeHistory(currencyCode)
              : Promise.resolve(null),
          ])
          next[city.id] = { climate, fx }
        }),
      )
      if (!cancelled) setExtras(next)
    })()

    return () => {
      cancelled = true
    }
  }, [targetKey, allTargets])

  useEffect(() => {
    let cancelled = false
    if (!targetKey) {
      setCurrencyById({})
      return
    }
    void (async () => {
      const next: typeof currencyById = {}
      await Promise.all(
        allTargets.map(async (city) => {
          const code = countryToCurrencyCode(city.country)
          if (!code || code === 'USD') {
            next[city.id] = { code: code ?? 'USD', name: 'US Dollar', rateLabel: 'Uses USD' }
            return
          }
          const info = await getLocalCurrencyInfo(code)
          if (!info) return
          next[city.id] = {
            code: info.currencyCode,
            name: info.currencyName,
            rateLabel: `1 USD ≈ ${formatUsdToLocalRate(info.rate, info.currencyCode)} ${info.currencyCode}`,
          }
        }),
      )
      if (!cancelled) setCurrencyById(next)
    })()
    return () => {
      cancelled = true
    }
  }, [targetKey, allTargets])

  const columns = useMemo(() => {
    const build = (city: MapCity): ComparisonColumnData => {
      const scored = scoreMapCity(city, monthlyIncome)
      const extra = extras[city.id]
      const cur = currencyById[city.id]
      return buildComparisonColumnData(
        scored,
        monthlyIncome,
        modeledAge,
        extra?.climate ?? null,
        extra?.fx ?? null,
        cur?.code ?? null,
        cur?.name ?? null,
        cur?.rateLabel ?? null,
      )
    }

    const out: ComparisonColumnData[] = []
    if (baselineCity) out.push(build(baselineCity))
    for (const s of compareScored) {
      if (baselineCity?.id === s.city.id) continue
      out.push(build(s.city))
    }
    return out
  }, [
    baselineCity,
    compareScored,
    extras,
    currencyById,
    monthlyIncome,
    modeledAge,
  ])

  const loading = allTargets.length > 0 && Object.keys(extras).length < allTargets.length

  return { columns, loading }
}

export function resolveCompareScored(
  compareIds: string[],
  monthlyIncome: number,
): ScoredMapCity[] {
  if (!compareIds.length) return []
  const byId = new Map(getAllMapCities().map((c) => [c.id, c]))
  return compareIds
    .map((id) => byId.get(id))
    .filter((c): c is MapCity => c != null)
    .map((city) => scoreMapCity(city, monthlyIncome))
}
