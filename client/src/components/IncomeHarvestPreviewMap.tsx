import { useEffect, useMemo, useState } from 'react'
import { geoNaturalEarth1 } from 'd3-geo'
import { feature } from 'topojson-client'
import type { GeoProjection } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'
import type { Topology } from 'topojson-specification'
import type { ScoredMapCity } from '../lib/whereToRetire/cityMapScoring'
import {
  buildWorldPaths,
  fetchWorldTopology,
  type MapRegionPath,
} from '../lib/whereToRetire/destinationMapGeo'
import type { RetirementScoreBand } from '../utils/retirementScore'
import './IncomeHarvestPreviewMap.scss'

const MAP_WIDTH = 360
const MAP_HEIGHT = 180

const PREVIEW_PIN_GREEN = '#0f9544'
const PREVIEW_PIN_AMBER = '#ED7E07'

type WorldMapAssets = {
  paths: MapRegionPath[]
  projection: GeoProjection
}

let cachedWorldMap: WorldMapAssets | null = null
let worldMapPromise: Promise<WorldMapAssets> | null = null

function previewPinColor(band: RetirementScoreBand): string {
  if (band === 'excellent' || band === 'good') return PREVIEW_PIN_GREEN
  if (band === 'moderate') return PREVIEW_PIN_AMBER
  return PREVIEW_PIN_GREEN
}

function loadWorldMapAssets(): Promise<WorldMapAssets> {
  if (cachedWorldMap) return Promise.resolve(cachedWorldMap)
  if (!worldMapPromise) {
    worldMapPromise = fetchWorldTopology().then((topology) => {
      const collection = feature(
        topology,
        topology.objects.countries as Topology['objects'][string],
      ) as FeatureCollection<Geometry>
      const projection = geoNaturalEarth1().fitSize([MAP_WIDTH, MAP_HEIGHT], collection)
      const paths = buildWorldPaths(topology, MAP_WIDTH, MAP_HEIGHT)
      cachedWorldMap = { paths, projection }
      return cachedWorldMap
    })
  }
  return worldMapPromise
}

function projectCity(projection: GeoProjection, lat: number, lng: number): [number, number] | null {
  const projected = projection([lng, lat])
  if (!projected) return null
  return projected
}

type Props = {
  destinations: ScoredMapCity[]
  loading?: boolean
  dimmed?: boolean
}

export function IncomeHarvestPreviewMap({ destinations, loading, dimmed = false }: Props) {
  const [worldMap, setWorldMap] = useState<WorldMapAssets | null>(cachedWorldMap)

  useEffect(() => {
    let cancelled = false
    loadWorldMapAssets().then((assets) => {
      if (!cancelled) setWorldMap(assets)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const pins = useMemo(() => {
    if (!worldMap) return []
    return destinations
      .map((item) => {
        const point = projectCity(worldMap.projection, item.city.lat, item.city.lng)
        if (!point) return null
        return {
          id: item.city.id,
          x: point[0],
          y: point[1],
          color: previewPinColor(item.band),
        }
      })
      .filter((pin): pin is NonNullable<typeof pin> => pin != null)
  }, [destinations, worldMap])

  if (loading || !worldMap) {
    return (
      <div
        className="income-harvest-preview-map income-harvest-preview-map--skeleton"
        aria-hidden
      />
    )
  }

  return (
    <div
      className={[
        'income-harvest-preview-map',
        dimmed ? 'income-harvest-preview-map--dimmed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <div className="income-harvest-preview-map__viewport">
        <div className="income-harvest-preview-map__drift">
          <svg
            className="income-harvest-preview-map__svg"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-label=""
          >
            <rect
              className="income-harvest-preview-map__ocean"
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
            />
            {worldMap.paths.map((path) => (
              <path
                key={path.id}
                className="income-harvest-preview-map__land"
                d={path.d}
              />
            ))}
            {pins.map((pin) => (
              <circle
                key={pin.id}
                className="income-harvest-preview-map__pin"
                cx={pin.x}
                cy={pin.y}
                r={2.5}
                fill={dimmed ? '#9ca3af' : pin.color}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}
