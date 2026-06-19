import maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { ScoredMapCity } from './cityMapScoring'
import { clearMapFlyPadding } from './flyMapToSelectedCity'

export const MAP_FIT_PADDING_PX = 60
export const MAP_FIT_SINGLE_CITY_ZOOM = 8
export const MAP_FIT_MAX_ZOOM = 10
export const MAP_FIT_MIN_ZOOM = 2

export type FitMapToResultsOptions = {
  padding?: number
  duration?: number
  maxZoom?: number
  minZoom?: number
  singleCityZoom?: number
}

/** Sync map viewport to the current result set. No-op when empty — keeps the current view. */
export function fitMapToResults(
  results: ScoredMapCity[],
  map: MapLibreMap,
  options: FitMapToResultsOptions = {},
): void {
  const {
    padding = MAP_FIT_PADDING_PX,
    duration = 0,
    maxZoom = MAP_FIT_MAX_ZOOM,
    minZoom = MAP_FIT_MIN_ZOOM,
    singleCityZoom = MAP_FIT_SINGLE_CITY_ZOOM,
  } = options

  if (results.length === 0) return

  clearMapFlyPadding(map)
  map.stop()

  if (results.length === 1) {
    const { lng, lat } = results[0].city
    map.easeTo({
      center: [lng, lat],
      zoom: Math.min(singleCityZoom, maxZoom),
      duration,
      essential: true,
    })
    return
  }

  const bounds = new maplibregl.LngLatBounds()
  results.forEach((item) => {
    bounds.extend([item.city.lng, item.city.lat])
  })

  map.fitBounds(bounds, {
    padding,
    duration,
    maxZoom,
    essential: true,
  })

  if (minZoom <= 0) return

  const clampMinZoom = () => {
    if (map.getZoom() < minZoom) {
      map.setZoom(minZoom)
    }
    map.off('moveend', clampMinZoom)
  }
  map.once('moveend', clampMinZoom)
}
