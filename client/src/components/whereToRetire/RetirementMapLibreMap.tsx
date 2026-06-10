import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { MapFilters, ScoredMapCity } from '../../lib/whereToRetire/cityMapScoring'
import {
  toggleExpatCommunityTier,
  type ExpatLegendTierId,
} from '../../lib/whereToRetire/cityMapScoring'
import {
  resolveMapPinDisplay,
  type MapPinColorView,
  type MapPinDisplay,
} from '../../lib/whereToRetire/mapPinDisplay'
import { WtrMapPinLegend } from './WtrMapPinLegend'
import { WtrMapPinTooltip } from './WtrMapPinTooltip'
import { WtrToolbarSelect } from './WtrToolbarSelect'
import './RetirementMapLibreMap.scss'
import './WtrMapPinLegend.scss'
import './WtrMapPinTooltip.scss'
import './WtrToolbarSelect.scss'

const DETAIL_FOCUS_ZOOM = 8
const DETAIL_EASE_DURATION_MS = 900
const BOUNDS_EASE_DURATION_MS = 900
const MAP_STYLE_STORAGE_KEY = 'wtr-map-style'

const MAP_STYLES = [
  { id: 'bright', label: 'Bright', url: 'https://tiles.openfreemap.org/styles/bright' },
  { id: 'positron', label: 'Positron', url: 'https://tiles.openfreemap.org/styles/positron' },
  { id: 'liberty', label: 'Liberty', url: 'https://tiles.openfreemap.org/styles/liberty' },
  { id: 'dark', label: 'Dark', url: 'https://tiles.openfreemap.org/styles/dark' },
  { id: 'fiord', label: 'Fiord', url: 'https://tiles.openfreemap.org/styles/fiord' },
] as const

type MapStyleId = (typeof MAP_STYLES)[number]['id']

const DEFAULT_MAP_STYLE_ID: MapStyleId = 'bright'

function readMapStyleId(): MapStyleId {
  try {
    const stored = localStorage.getItem(MAP_STYLE_STORAGE_KEY)
    if (stored && MAP_STYLES.some((style) => style.id === stored)) {
      return stored as MapStyleId
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_MAP_STYLE_ID
}

function mapStyleUrl(id: MapStyleId): string {
  return MAP_STYLES.find((style) => style.id === id)?.url ?? MAP_STYLES[0].url
}

type Props = {
  destinations: ScoredMapCity[]
  monthlyIncome: number
  pinColorView: MapPinColorView
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
  favoritedKeySet: ReadonlySet<string>
  selectedId: string | null
  /** When true, emphasize the selected pin and fly to that city; when false, fit all destinations. */
  detailPanelOpen: boolean
  fitKey: string
  onSelect: (id: string) => void
}

type MarkerEntry = {
  marker: maplibregl.Marker
  pinEl: HTMLSpanElement
  popup: maplibregl.Popup
  popupContainer: HTMLDivElement
  popupRoot: Root | null
  cityId: string
}

function detailFocusId(selectedId: string | null, detailPanelOpen: boolean): string | null {
  return detailPanelOpen && selectedId ? selectedId : null
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function whenMapReady(map: maplibregl.Map, run: () => void): () => void {
  if (map.isStyleLoaded()) {
    run()
    return () => {}
  }
  map.once('load', run)
  return () => {
    map.off('load', run)
  }
}

function applyPinDisplay(
  pinEl: HTMLSpanElement,
  display: MapPinDisplay,
  sizePx: number,
  focusId: string | null,
  cityId: string,
) {
  const isFocused = cityId === focusId
  pinEl.className = [
    'wtr-map-pin',
    `wtr-map-pin--${display.bandClass}`,
    isFocused && 'wtr-map-pin--selected',
    isFocused && 'wtr-map-pin--detail',
  ]
    .filter(Boolean)
    .join(' ')
  pinEl.style.width = `${sizePx}px`
  pinEl.style.height = `${sizePx}px`
  pinEl.style.background = display.pinColor
  pinEl.dataset.cityId = cityId
}

function syncPinSelection(mapContainer: HTMLElement, focusId: string | null) {
  mapContainer.querySelectorAll<HTMLElement>('.wtr-map-pin').forEach((el) => {
    const id = el.getAttribute('data-city-id')
    const isFocused = id != null && id === focusId
    el.classList.toggle('wtr-map-pin--selected', isFocused)
    el.classList.toggle('wtr-map-pin--detail', isFocused)
    const markerHost = el.closest('.maplibregl-marker') as HTMLElement | null
    if (markerHost) {
      markerHost.style.zIndex = isFocused ? '2' : ''
    }
  })
}

export function RetirementMapLibreMap({
  destinations,
  monthlyIncome,
  pinColorView,
  filters,
  onFiltersChange,
  favoritedKeySet,
  selectedId,
  detailPanelOpen,
  fitKey,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef(new Map<string, MarkerEntry>())
  const pinDisplaysRef = useRef(new Map<string, MapPinDisplay>())
  const destinationsRef = useRef(destinations)
  const onSelectRef = useRef(onSelect)
  const [mapStyleId, setMapStyleId] = useState<MapStyleId>(readMapStyleId)
  const mapStyleIdRef = useRef(mapStyleId)
  const prevFocusIdForBoundsRef = useRef<string | null>(null)
  const prevFocusFlyRef = useRef<string | null>(null)
  const prevFitKeyRef = useRef(fitKey)
  const hasAutoFitRef = useRef(false)

  const handleToggleExpatTier = useCallback(
    (tier: ExpatLegendTierId) => {
      onFiltersChange({
        ...filters,
        expatCommunityTiers: toggleExpatCommunityTier(filters.expatCommunityTiers, tier),
      })
    },
    [filters, onFiltersChange],
  )

  const focusId = detailFocusId(selectedId, detailPanelOpen)

  const pinDisplays = useMemo(
    () =>
      new Map(
        destinations.map((item) => {
          const isFavorite = favoritedKeySet.has(
            `${item.city.city}\u0001${item.city.country}`,
          )
          return [
            item.city.id,
            resolveMapPinDisplay(item, pinColorView, monthlyIncome, isFavorite),
          ]
        }),
      ),
    [destinations, monthlyIncome, pinColorView, favoritedKeySet],
  )

  pinDisplaysRef.current = pinDisplays
  destinationsRef.current = destinations
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleUrl(mapStyleIdRef.current),
      center: [0, 20],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      attributionControl: { compact: true },
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')

    mapRef.current = map

    return () => {
      markersRef.current.forEach((entry) => {
        entry.popupRoot?.unmount()
        entry.marker.remove()
      })
      markersRef.current.clear()
      map.remove()
      mapRef.current = null
    }
  }, [])

  const handleMapStyleChange = useCallback((id: MapStyleId) => {
    setMapStyleId(id)
    try {
      localStorage.setItem(MAP_STYLE_STORAGE_KEY, id)
    } catch {
      // ignore storage errors
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || mapStyleId === mapStyleIdRef.current) return
    mapStyleIdRef.current = mapStyleId
    map.setStyle(mapStyleUrl(mapStyleId))
  }, [mapStyleId])

  useEffect(() => {
    const map = mapRef.current
    const container = containerRef.current
    if (!map || !container) return

    let resizeTimer: number | undefined

    const resize = () => {
      if (resizeTimer != null) window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        map.resize()
      }, 100)
    }

    resize()

    const host = container.parentElement
    const ro =
      host && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    if (host && ro) ro.observe(host)

    window.addEventListener('resize', resize)
    return () => {
      if (resizeTimer != null) window.clearTimeout(resizeTimer)
      ro?.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const nextIds = new Set(destinations.map((item) => item.city.id))

    for (const [cityId, entry] of markersRef.current) {
      if (nextIds.has(cityId)) continue
      entry.popupRoot?.unmount()
      entry.marker.remove()
      markersRef.current.delete(cityId)
    }

    destinations.forEach((item) => {
      const display = pinDisplays.get(item.city.id)
      if (!display) return

      const cityId = item.city.id
      let entry = markersRef.current.get(cityId)
      if (!entry) {
        const pinEl = document.createElement('span')
        const host = document.createElement('div')
        host.className = 'wtr-map-pin-host'
        host.appendChild(pinEl)

        const popupContainer = document.createElement('div')
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          closeOnMove: false,
          offset: [0, -6],
          className: 'wtr-pin-tooltip-host',
        }).setDOMContent(popupContainer)

        host.addEventListener('click', () => {
          onSelectRef.current(cityId)
        })

        host.addEventListener('mouseenter', () => {
          const scored = destinationsRef.current.find((d) => d.city.id === cityId)
          const currentDisplay = pinDisplaysRef.current.get(cityId)
          if (!scored || !currentDisplay) return

          const markerEntry = markersRef.current.get(cityId)
          if (!markerEntry) return

          if (!markerEntry.popupRoot) {
            markerEntry.popupRoot = createRoot(popupContainer)
          }
          markerEntry.popupRoot.render(
            <WtrMapPinTooltip scored={scored} display={currentDisplay} />,
          )
          popup.setLngLat([scored.city.lng, scored.city.lat]).addTo(map)
        })

        host.addEventListener('mouseleave', () => {
          popup.remove()
        })

        const marker = new maplibregl.Marker({ element: host, anchor: 'center' })
          .setLngLat([item.city.lng, item.city.lat])
          .addTo(map)

        entry = {
          marker,
          pinEl,
          popup,
          popupContainer,
          popupRoot: null,
          cityId,
        }
        markersRef.current.set(cityId, entry)
      } else {
        entry.marker.setLngLat([item.city.lng, item.city.lat])
      }

      applyPinDisplay(entry.pinEl, display, item.pinSizePx, focusId, cityId)
    })
  }, [destinations, pinDisplays, focusId])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const prevFocus = prevFocusIdForBoundsRef.current
    prevFocusIdForBoundsRef.current = focusId

    if (focusId) return

    const panelJustClosed = prevFocus != null
    const filtersChanged = fitKey !== prevFitKeyRef.current
    prevFitKeyRef.current = fitKey

    if (hasAutoFitRef.current && !panelJustClosed && !filtersChanged) return
    hasAutoFitRef.current = true

    return whenMapReady(map, () => {
      const reduced = prefersReducedMotion()
      const duration = reduced ? 0 : BOUNDS_EASE_DURATION_MS
      const visibleDestinations = destinationsRef.current

      map.stop()

      if (!visibleDestinations.length) {
        map.easeTo({
          center: [0, 20],
          zoom: 2,
          duration: reduced ? 0 : BOUNDS_EASE_DURATION_MS * 0.85,
          essential: true,
        })
        return
      }

      const bounds = new maplibregl.LngLatBounds()
      visibleDestinations.forEach((item) => {
        bounds.extend([item.city.lng, item.city.lat])
      })

      map.fitBounds(bounds, {
        padding: 40,
        duration,
        maxZoom: 6,
        essential: true,
      })
    })
  }, [fitKey, focusId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusId) {
      prevFocusFlyRef.current = null
      return
    }
    if (focusId === prevFocusFlyRef.current) return
    prevFocusFlyRef.current = focusId

    const hit = destinationsRef.current.find((d) => d.city.id === focusId)
    if (!hit) return

    return whenMapReady(map, () => {
      map.stop()
      map.easeTo({
        center: [hit.city.lng, hit.city.lat],
        zoom: DETAIL_FOCUS_ZOOM,
        duration: prefersReducedMotion() ? 0 : DETAIL_EASE_DURATION_MS,
        essential: true,
      })
    })
  }, [focusId])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const id = window.setTimeout(() => syncPinSelection(container, focusId), 0)
    return () => window.clearTimeout(id)
  }, [focusId, destinations.length])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let clearEnter: number | undefined

    const id = window.setTimeout(() => {
      if (destinations.length > 0 && !container.querySelector('.wtr-map-pin')) return

      container.classList.remove('wtr-maplibre-map--pins-enter')
      void container.offsetHeight
      container.classList.add('wtr-maplibre-map--pins-enter')
      clearEnter = window.setTimeout(() => {
        container.classList.remove('wtr-maplibre-map--pins-enter')
      }, 450)
    }, 50)

    return () => {
      window.clearTimeout(id)
      if (clearEnter != null) window.clearTimeout(clearEnter)
      container.classList.remove('wtr-maplibre-map--pins-enter')
    }
  }, [fitKey, destinations.length])

  useEffect(() => {
    const id = window.setTimeout(() => {
      destinations.forEach((item) => {
        const entry = markersRef.current.get(item.city.id)
        const display = pinDisplays.get(item.city.id)
        if (!entry || !display) return
        applyPinDisplay(entry.pinEl, display, item.pinSizePx, focusId, item.city.id)
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [destinations, monthlyIncome, pinColorView, favoritedKeySet, pinDisplays, focusId])

  return (
    <div className="wtr-maplibre-map">
      <div className="wtr-maplibre-map__legend-overlay">
        <WtrMapPinLegend
          view={pinColorView}
          variant="overlay"
          activeExpatTiers={filters.expatCommunityTiers}
          onToggleExpatTier={
            pinColorView === 'expat' ? handleToggleExpatTier : undefined
          }
        />
      </div>
      <div className="wtr-maplibre-map__style-overlay">
        <WtrToolbarSelect
          ariaLabel="Map style"
          value={mapStyleId}
          options={MAP_STYLES.map((style) => ({
            id: style.id,
            label: style.label,
          }))}
          onChange={handleMapStyleChange}
          className="wtr-maplibre-map__style-select"
          layout="auto"
        />
      </div>
      <div ref={containerRef} className="wtr-maplibre-map__canvas" />
    </div>
  )
}
