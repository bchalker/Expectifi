import { useEffect, useState } from 'react'
import type { CityClimate } from '../lib/api/openMeteo'
import { getCityClimateForPlace } from '../lib/api/openMeteo'
import type { MapCity } from '../utils/costOfLiving'
import { getCityClimateNormals } from '../utils/climateNormals'

export type CityClimateSource = 'live' | 'normals'

type CityClimateState = {
  climate: CityClimate | null
  /** `live` = Open-Meteo API; `normals` = static climate-normals.json fallback. */
  source: CityClimateSource | null
  loading: boolean
  failed: boolean
}

export function useCityClimate(city: MapCity | null): CityClimateState {
  const [climate, setClimate] = useState<CityClimate | null>(null)
  const [source, setSource] = useState<CityClimateSource | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!city) {
      setClimate(null)
      setSource(null)
      setLoading(false)
      setFailed(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setClimate(null)
    setSource(null)
    setFailed(false)

    void (async () => {
      const live = await getCityClimateForPlace(
        city.city,
        city.country,
        city.lat,
        city.lng,
      )
      const normals = live
        ? null
        : getCityClimateNormals(city.city, city.country)
      if (cancelled) return
      if (live) {
        setClimate(live)
        setSource('live')
        setFailed(false)
      } else if (normals) {
        setClimate(normals)
        setSource('normals')
        setFailed(false)
      } else {
        setClimate(null)
        setSource(null)
        setFailed(true)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [city?.id, city?.city, city?.country, city?.lat, city?.lng])

  return { climate, source, loading, failed }
}
