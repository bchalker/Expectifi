import { useEffect, useState } from 'react'
import type { CityClimate } from '../lib/api/openMeteo'
import { getCityClimateForPlace } from '../lib/api/openMeteo'
import type { MapCity } from '../utils/costOfLiving'
import { getCityClimateNormals } from '../utils/climateNormals'

type CityClimateState = {
  climate: CityClimate | null
  loading: boolean
  failed: boolean
}

export function useCityClimate(city: MapCity | null): CityClimateState {
  const [climate, setClimate] = useState<CityClimate | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!city) {
      setClimate(null)
      setLoading(false)
      setFailed(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setClimate(null)
    setFailed(false)

    void (async () => {
      const live =
        (await getCityClimateForPlace(city.city, city.country, city.lat, city.lng)) ??
        getCityClimateNormals(city.city, city.country)
      if (cancelled) return
      if (live) {
        setClimate(live)
        setFailed(false)
      } else {
        setClimate(null)
        setFailed(true)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [city?.id, city?.city, city?.country, city?.lat, city?.lng])

  return { climate, loading, failed }
}
