import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import type { ScoredMapCity } from './cityMapScoring'
import type { MapPinDisplay } from './mapPinDisplay'

export const WTR_CITIES_SOURCE = 'wtr-cities'
export const WTR_CITIES_LAYER = 'wtr-cities-circles'

const EMPTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

export function buildCitiesGeoJson(
  destinations: ScoredMapCity[],
  pinDisplays: Map<string, MapPinDisplay>,
  focusId: string | null,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: destinations.flatMap((item) => {
      const display = pinDisplays.get(item.city.id)
      if (!display) return []
      const isFocused = item.city.id === focusId
      if (isFocused) return []
      return [
        {
          type: 'Feature' as const,
          id: item.city.id,
          geometry: {
            type: 'Point' as const,
            coordinates: [item.city.lng, item.city.lat],
          },
          properties: {
            cityId: item.city.id,
            pinColor: display.pinColor,
            pinRadius: Math.max(3, item.pinSizePx / 2),
            baseOpacity: 0.5,
            strokeWidth: 1,
          },
        },
      ]
    }),
  }
}

export function ensureWtrCityLayers(map: MapLibreMap): void {
  if (!map.getSource(WTR_CITIES_SOURCE)) {
    map.addSource(WTR_CITIES_SOURCE, {
      type: 'geojson',
      data: EMPTY_GEOJSON,
      promoteId: 'cityId',
    })
  }

  if (!map.getLayer(WTR_CITIES_LAYER)) {
    map.addLayer({
      id: WTR_CITIES_LAYER,
      type: 'circle',
      source: WTR_CITIES_SOURCE,
      paint: {
        'circle-radius': ['get', 'pinRadius'],
        'circle-color': ['get', 'pinColor'],
        'circle-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          1,
          ['get', 'baseOpacity'],
        ],
        'circle-stroke-width': ['get', 'strokeWidth'],
        'circle-stroke-color': '#ffffff',
      },
    })
  }
}

export function updateWtrCityLayerData(map: MapLibreMap, data: GeoJSON.FeatureCollection): void {
  ensureWtrCityLayers(map)
  const source = map.getSource(WTR_CITIES_SOURCE) as GeoJSONSource | undefined
  source?.setData(data)
}

export function clearWtrCityHoverState(map: MapLibreMap, cityId: string | null): void {
  if (!cityId || !map.getSource(WTR_CITIES_SOURCE)) return
  try {
    map.removeFeatureState({ source: WTR_CITIES_SOURCE, id: cityId }, 'hover')
  } catch {
    /* feature may have been removed */
  }
}
