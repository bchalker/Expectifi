import maplibregl from 'maplibre-gl'

export type WtrActiveMapMarker = {
  cityId: string
  lng: number
  lat: number
  pinColor: string
}

export const WTR_MAP_MARKER_BASE_CLASS = 'map-marker'
export const WTR_MAP_MARKER_ACTIVE_CLASS = 'map-marker--active'

export function createMapMarkerElement(pinColor: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = WTR_MAP_MARKER_BASE_CLASS
  el.style.setProperty('--map-marker-color', pinColor)
  return el
}

export function setMapMarkerPinColor(el: HTMLElement, pinColor: string): void {
  el.style.setProperty('--map-marker-color', pinColor)
}

export function setMapMarkerActive(el: HTMLElement, active: boolean): void {
  el.classList.toggle(WTR_MAP_MARKER_ACTIVE_CLASS, active)
  if (!active) {
    el.classList.add(WTR_MAP_MARKER_BASE_CLASS)
  }
}

export function createActiveMapMarker(
  map: maplibregl.Map,
  lng: number,
  lat: number,
  pinColor: string,
): maplibregl.Marker {
  const element = createMapMarkerElement(pinColor)
  element.classList.add(WTR_MAP_MARKER_ACTIVE_CLASS)
  return new maplibregl.Marker({ element, anchor: 'center' })
    .setLngLat([lng, lat])
    .addTo(map)
}

/** Sync the pulsing DOM marker for the detail-panel selection. */
export function syncActiveMapMarker(
  map: maplibregl.Map,
  markers: Map<string, maplibregl.Marker>,
  activeMarkerIdRef: { current: string | null },
  focusId: string | null,
  coords: { lng: number; lat: number } | null,
  pinColor: string | null,
): void {
  const prevId = activeMarkerIdRef.current

  if (prevId && prevId !== focusId) {
    const prevMarker = markers.get(prevId)
    const prevEl = prevMarker?.getElement()
    if (prevEl) {
      setMapMarkerActive(prevEl, false)
    }
    prevMarker?.remove()
    markers.delete(prevId)
  }

  if (!focusId || !coords || !pinColor) {
    if (prevId) {
      const prevMarker = markers.get(prevId)
      const prevEl = prevMarker?.getElement()
      if (prevEl) {
        setMapMarkerActive(prevEl, false)
      }
      prevMarker?.remove()
      markers.delete(prevId)
    }
    activeMarkerIdRef.current = null
    return
  }

  let marker = markers.get(focusId)
  if (!marker) {
    marker = createActiveMapMarker(map, coords.lng, coords.lat, pinColor)
    markers.set(focusId, marker)
  } else {
    const el = marker.getElement()
    setMapMarkerPinColor(el, pinColor)
    setMapMarkerActive(el, true)
    marker.setLngLat([coords.lng, coords.lat])
  }

  activeMarkerIdRef.current = focusId
}

export function removeAllMapMarkers(markers: Map<string, maplibregl.Marker>): void {
  markers.forEach((marker) => marker.remove())
  markers.clear()
}
