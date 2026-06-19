import type { Map as MapLibreMap, PaddingOptions } from 'maplibre-gl'

export const MAP_DETAIL_CITY_ZOOM = 10
export const MAP_DETAIL_FLY_DURATION_MS = 1000
export const MAP_DETAIL_FLY_EDGE_PADDING_PX = 48

export function clearMapFlyPadding(map: MapLibreMap): void {
  map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 })
}

function mapHasPadding(map: MapLibreMap): boolean {
  const padding = map.getPadding()
  return (
    (padding.top ?? 0) > 0 ||
    (padding.bottom ?? 0) > 0 ||
    (padding.left ?? 0) > 0 ||
    (padding.right ?? 0) > 0
  )
}

export type FlyMapToSelectedCityOptions = {
  /** Extra right inset when the detail panel overlays the map (not in-flow column layout). */
  overlayPanelWidth?: number
  duration?: number
  zoom?: number
  cityId?: string
  /** Direct pan/zoom when switching cities with the detail panel already open. */
  citySwitch?: boolean
}

function isValidCoord(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Animate the map to a selected city. Column layout: center in the map stage. Overlay: inset for the rail. */
export function flyMapToSelectedCity(
  map: MapLibreMap,
  lng: number,
  lat: number,
  options: FlyMapToSelectedCityOptions = {},
): void {
  if (!isValidCoord(lng) || !isValidCoord(lat)) {
    console.warn(
      '[wtr-map] flyMapToSelectedCity skipped — invalid coordinates',
      { cityId: options.cityId, lng, lat },
    )
    return
  }

  const {
    overlayPanelWidth = 0,
    duration = MAP_DETAIL_FLY_DURATION_MS,
    zoom = MAP_DETAIL_CITY_ZOOM,
    citySwitch = false,
  } = options

  map.stop()

  const targetZoom = Math.min(zoom, map.getMaxZoom())

  const moveToCity = (padding?: PaddingOptions) => {
    const camera = {
      center: [lng, lat] as [number, number],
      zoom: targetZoom,
      ...(padding ? { padding } : {}),
      duration,
      essential: true,
    }

    if (citySwitch) {
      map.easeTo(camera)
      return
    }

    map.flyTo({
      ...camera,
      curve: 1.1,
    })
  }

  if (overlayPanelWidth > 0) {
    moveToCity({
      top: MAP_DETAIL_FLY_EDGE_PADDING_PX,
      bottom: MAP_DETAIL_FLY_EDGE_PADDING_PX,
      left: MAP_DETAIL_FLY_EDGE_PADDING_PX,
      right: overlayPanelWidth + MAP_DETAIL_FLY_EDGE_PADDING_PX,
    })
    return
  }

  if (mapHasPadding(map)) {
    clearMapFlyPadding(map)
  }
  moveToCity()
}
