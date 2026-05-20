import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import type { ScoredMapCity } from '../../lib/whereToRetire/cityMapScoring'
import 'leaflet/dist/leaflet.css'
import './RetirementLeafletMap.scss'

type Props = {
  heightPx: number
  destinations: ScoredMapCity[]
  selectedId: string | null
  fitKey: string
  onSelect: (id: string) => void
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

function pinIcon(tier: ScoredMapCity['tier'], sizePx: number, cityId: string, score: number) {
  const title = `Retirement income fit score: ${score}`
  return L.divIcon({
    className: 'wtr-leaflet-pin-host',
    html: `<span class="wtr-leaflet-pin wtr-leaflet-pin--${tier}" data-city-id="${cityId}" title="${title}" style="width:${sizePx}px;height:${sizePx}px"></span>`,
    iconSize: [sizePx, sizePx],
    iconAnchor: [sizePx / 2, sizePx / 2],
  })
}

function MapResizeFix({ heightPx }: { heightPx: number }) {
  const map = useMap()
  useEffect(() => {
    const invalidate = () => {
      map.invalidateSize()
    }
    invalidate()
    const id = window.setTimeout(invalidate, 0)
    const id2 = window.setTimeout(invalidate, 250)
    window.addEventListener('resize', invalidate)
    return () => {
      window.clearTimeout(id)
      window.clearTimeout(id2)
      window.removeEventListener('resize', invalidate)
    }
  }, [map, heightPx])
  return null
}

function MapSelectionFocus({
  destinations,
  selectedId,
}: {
  destinations: ScoredMapCity[]
  selectedId: string | null
}) {
  const map = useMap()
  const prevSelectedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!selectedId) {
      prevSelectedRef.current = null
      return
    }
    if (selectedId === prevSelectedRef.current) return
    prevSelectedRef.current = selectedId

    const hit = destinations.find((d) => d.city.id === selectedId)
    if (!hit) return
    map.flyTo([hit.city.lat, hit.city.lng], Math.max(map.getZoom(), 4), {
      duration: 0.6,
    })
  }, [destinations, map, selectedId])

  return null
}

function MapBoundsFit({
  destinations,
  fitKey,
  selectedId,
}: {
  destinations: ScoredMapCity[]
  fitKey: string
  selectedId: string | null
}) {
  const map = useMap()

  useEffect(() => {
    if (selectedId) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = prefersReduced ? 0 : 0.75

    if (!destinations.length) {
      map.flyTo([20, 0], 2, { duration: prefersReduced ? 0 : 0.5 })
      return
    }

    const latLngs = destinations.map((d) => [d.city.lat, d.city.lng] as [number, number])
    map.flyToBounds(L.latLngBounds(latLngs).pad(0.25), {
      padding: [40, 40],
      duration,
      maxZoom: 6,
    })
  }, [destinations, fitKey, map, selectedId])

  return null
}

function syncPinSelection(map: L.Map, selectedId: string | null) {
  map.getContainer().querySelectorAll<HTMLElement>('.wtr-leaflet-pin').forEach((el) => {
    const id = el.getAttribute('data-city-id')
    el.classList.toggle('wtr-leaflet-pin--selected', id != null && id === selectedId)
  })
}

/** Toggle selected pin styling without recreating marker icons (avoids re-running enter animation). */
function MapPinSelectionStyles({
  selectedId,
  pinCount,
}: {
  selectedId: string | null
  pinCount: number
}) {
  const map = useMap()

  useEffect(() => {
    const id = window.setTimeout(() => syncPinSelection(map, selectedId), 0)
    return () => window.clearTimeout(id)
  }, [map, selectedId, pinCount])

  return null
}

/** Pin enter animation only when filters change (fitKey), not on selection. */
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

export function RetirementLeafletMap({ heightPx, destinations, selectedId, fitKey, onSelect }: Props) {
  return (
    <div className="wtr-leaflet-map" style={{ height: heightPx }}>
      <MapContainer
        className="wtr-leaflet-map__canvas"
        style={{ height: heightPx, width: '100%' }}
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={8}
        scrollWheelZoom
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <MapResizeFix heightPx={heightPx} />
        <MapBoundsFit destinations={destinations} fitKey={fitKey} selectedId={selectedId} />
        <MapSelectionFocus destinations={destinations} selectedId={selectedId} />
        <MapPinSelectionStyles selectedId={selectedId} pinCount={destinations.length} />
        <MapPinEnterAnimation fitKey={fitKey} pinCount={destinations.length} />
        {destinations.map((item) => (
          <Marker
            key={item.city.id}
            position={[item.city.lat, item.city.lng]}
            icon={pinIcon(item.tier, item.pinSizePx, item.city.id, item.affordabilityScore)}
            eventHandlers={{
              click: () => onSelect(item.city.id),
            }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
