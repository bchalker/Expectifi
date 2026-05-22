import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { ScoredMapCity } from '../../lib/whereToRetire/cityMapScoring'
import {
  resolveMapPinDisplay,
  type MapPinColorView,
} from '../../lib/whereToRetire/mapPinDisplay'
import { WtrMapPinLegend } from './WtrMapPinLegend'
import { WtrMapPinTooltip } from './WtrMapPinTooltip'
import 'leaflet/dist/leaflet.css'
import './RetirementLeafletMap.scss'
import './WtrMapPinLegend.scss'
import './WtrMapPinTooltip.scss'

const DETAIL_FOCUS_ZOOM = 8
/** Leaflet `flyTo` / `flyToBounds` duration in seconds */
const DETAIL_FLY_DURATION_S = 1.35
const BOUNDS_FLY_DURATION_S = 1.1

type Props = {
  destinations: ScoredMapCity[]
  monthlyIncome: number
  pinColorView: MapPinColorView
  selectedId: string | null
  /** When true, emphasize the selected pin and fly to that city; when false, fit all destinations. */
  detailPanelOpen: boolean
  fitKey: string
  onSelect: (id: string) => void
}

function detailFocusId(selectedId: string | null, detailPanelOpen: boolean): string | null {
  return detailPanelOpen && selectedId ? selectedId : null
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function pinIcon(
  bandClass: string,
  pinColor: string,
  sizePx: number,
  cityId: string,
) {
  return L.divIcon({
    className: 'wtr-leaflet-pin-host',
    html: `<span class="wtr-leaflet-pin wtr-leaflet-pin--${bandClass}" data-city-id="${cityId}" style="width:${sizePx}px;height:${sizePx}px;background:${pinColor}"></span>`,
    iconSize: [sizePx, sizePx],
    iconAnchor: [sizePx / 2, sizePx / 2],
  })
}

function MapResizeFix() {
  const map = useMap()
  useEffect(() => {
    const invalidate = () => {
      map.invalidateSize()
    }
    invalidate()
    const id = window.setTimeout(invalidate, 0)
    const id2 = window.setTimeout(invalidate, 250)

    const host = map.getContainer().parentElement
    const ro =
      host && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(invalidate)
        : null
    if (host && ro) ro.observe(host)

    window.addEventListener('resize', invalidate)
    return () => {
      window.clearTimeout(id)
      window.clearTimeout(id2)
      ro?.disconnect()
      window.removeEventListener('resize', invalidate)
    }
  }, [map])
  return null
}

function MapSelectionFocus({
  destinations,
  focusId,
}: {
  destinations: ScoredMapCity[]
  focusId: string | null
}) {
  const map = useMap()
  const prevFocusRef = useRef<string | null>(null)

  useEffect(() => {
    if (!focusId) {
      prevFocusRef.current = null
      return
    }
    if (focusId === prevFocusRef.current) return
    prevFocusRef.current = focusId

    const hit = destinations.find((d) => d.city.id === focusId)
    if (!hit) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    map.flyTo([hit.city.lat, hit.city.lng], DETAIL_FOCUS_ZOOM, {
      duration: prefersReduced ? 0 : DETAIL_FLY_DURATION_S,
      easeLinearity: 0.35,
    })
  }, [destinations, focusId, map])

  return null
}

function MapBoundsFit({
  destinations,
  fitKey,
  focusId,
}: {
  destinations: ScoredMapCity[]
  fitKey: string
  focusId: string | null
}) {
  const map = useMap()

  useEffect(() => {
    if (focusId) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = prefersReduced ? 0 : BOUNDS_FLY_DURATION_S

    if (!destinations.length) {
      map.flyTo([20, 0], 2, {
        duration: prefersReduced ? 0 : BOUNDS_FLY_DURATION_S * 0.85,
        easeLinearity: 0.35,
      })
      return
    }

    const latLngs = destinations.map((d) => [d.city.lat, d.city.lng] as [number, number])
    map.flyToBounds(L.latLngBounds(latLngs).pad(0.25), {
      padding: [40, 40],
      duration,
      easeLinearity: 0.35,
      maxZoom: 6,
    })
  }, [destinations, fitKey, focusId, map])

  return null
}

function syncPinSelection(map: L.Map, focusId: string | null) {
  map.getContainer().querySelectorAll<HTMLElement>('.wtr-leaflet-pin').forEach((el) => {
    const id = el.getAttribute('data-city-id')
    const isFocused = id != null && id === focusId
    el.classList.toggle('wtr-leaflet-pin--selected', isFocused)
    el.classList.toggle('wtr-leaflet-pin--detail', isFocused)
  })
}

/** Toggle selected pin styling without recreating marker icons (avoids re-running enter animation). */
function MapPinSelectionStyles({
  focusId,
  pinCount,
}: {
  focusId: string | null
  pinCount: number
}) {
  const map = useMap()

  useEffect(() => {
    const id = window.setTimeout(() => syncPinSelection(map, focusId), 0)
    return () => window.clearTimeout(id)
  }, [focusId, map, pinCount])

  return null
}

/** Pin enter animation only when filters change (fitKey), not on selection or color view. */
function MapPinEnterAnimation({ fitKey, pinCount }: { fitKey: string; pinCount: number }) {
  const map = useMap()

  useEffect(() => {
    let clearEnter: number | undefined

    const id = window.setTimeout(() => {
      const root = map.getContainer()
      if (pinCount > 0 && !root.querySelector('.wtr-leaflet-pin')) return

      root.classList.remove('wtr-leaflet-map--pins-enter')
      void root.offsetHeight
      root.classList.add('wtr-leaflet-map--pins-enter')
      clearEnter = window.setTimeout(() => {
        root.classList.remove('wtr-leaflet-map--pins-enter')
      }, 450)
    }, 50)

    return () => {
      window.clearTimeout(id)
      if (clearEnter != null) window.clearTimeout(clearEnter)
      map.getContainer().classList.remove('wtr-leaflet-map--pins-enter')
    }
  }, [fitKey, map, pinCount])

  return null
}

/** Re-apply pin background colors when score/budget view or income changes (icons are not recreated). */
function MapPinColorSync({
  destinations,
  monthlyIncome,
  pinColorView,
}: {
  destinations: ScoredMapCity[]
  monthlyIncome: number
  pinColorView: MapPinColorView
}) {
  const map = useMap()

  useEffect(() => {
    const id = window.setTimeout(() => {
      destinations.forEach((item) => {
        const display = resolveMapPinDisplay(item, pinColorView, monthlyIncome)
        const el = map
          .getContainer()
          .querySelector<HTMLElement>(
            `.wtr-leaflet-pin[data-city-id="${CSS.escape(item.city.id)}"]`,
          )
        if (!el) return
        const isSelected = el.classList.contains('wtr-leaflet-pin--selected')
        const isDetail = el.classList.contains('wtr-leaflet-pin--detail')
        el.className = [
          'wtr-leaflet-pin',
          `wtr-leaflet-pin--${display.bandClass}`,
          isSelected && 'wtr-leaflet-pin--selected',
          isDetail && 'wtr-leaflet-pin--detail',
        ]
          .filter(Boolean)
          .join(' ')
        el.style.background = display.pinColor
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [destinations, monthlyIncome, pinColorView, map])

  return null
}

export function RetirementLeafletMap({
  destinations,
  monthlyIncome,
  pinColorView,
  selectedId,
  detailPanelOpen,
  fitKey,
  onSelect,
}: Props) {
  const focusId = detailFocusId(selectedId, detailPanelOpen)

  const pinDisplays = useMemo(
    () =>
      new Map(
        destinations.map((item) => [
          item.city.id,
          resolveMapPinDisplay(item, pinColorView, monthlyIncome),
        ]),
      ),
    [destinations, monthlyIncome, pinColorView],
  )

  return (
    <div className="wtr-leaflet-map">
      <div className="wtr-leaflet-map__legend-overlay">
        <WtrMapPinLegend view={pinColorView} variant="overlay" />
      </div>
      <MapContainer
        className="wtr-leaflet-map__canvas"
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={8}
        scrollWheelZoom
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <MapResizeFix />
        <MapBoundsFit destinations={destinations} fitKey={fitKey} focusId={focusId} />
        <MapSelectionFocus destinations={destinations} focusId={focusId} />
        <MapPinSelectionStyles focusId={focusId} pinCount={destinations.length} />
        <MapPinEnterAnimation fitKey={fitKey} pinCount={destinations.length} />
        <MapPinColorSync
          destinations={destinations}
          monthlyIncome={monthlyIncome}
          pinColorView={pinColorView}
        />
        {destinations.map((item) => {
          const display = pinDisplays.get(item.city.id)!
          return (
            <Marker
              key={`${item.city.id}-${pinColorView}-${display.pinColor}`}
              position={[item.city.lat, item.city.lng]}
              zIndexOffset={focusId === item.city.id ? 1000 : 0}
              icon={pinIcon(display.bandClass, display.pinColor, item.pinSizePx, item.city.id)}
              eventHandlers={{
                click: () => onSelect(item.city.id),
              }}
            >
              <Tooltip
                className="wtr-pin-tooltip-host"
                direction="top"
                offset={[0, -6]}
                opacity={1}
              >
                <WtrMapPinTooltip scored={item} display={display} />
              </Tooltip>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
