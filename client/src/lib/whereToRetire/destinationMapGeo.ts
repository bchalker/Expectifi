import { geoAlbersUsa, geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import type { Topology } from 'topojson-specification'
import { COUNTRY_TAX_RATES } from '../../data/countryTaxRates'
import { STATE_TAX_RATES } from '../../data/stateTaxRates'
import { catalogKeyFromCountryNumeric, catalogKeyFromStateFips } from './geoIds'

export type MapRegionPath = {
  id: string
  d: string
  catalogKey: string | null
  name: string
  kind: 'country' | 'state' | 'other'
}

const CATALOG_COUNTRY_CODES = new Set(Object.keys(COUNTRY_TAX_RATES))
const CATALOG_STATE_CODES = new Set(Object.keys(STATE_TAX_RATES))

export async function fetchWorldTopology(): Promise<Topology> {
  const res = await fetch('/geo/countries-110m.json')
  if (!res.ok) throw new Error('Failed to load world map data')
  return (await res.json()) as Topology
}

export async function fetchUsStatesTopology(): Promise<Topology> {
  const res = await fetch('/geo/states-10m.json')
  if (!res.ok) throw new Error('Failed to load US states map data')
  return (await res.json()) as Topology
}

export function buildWorldPaths(topology: Topology, width: number, height: number): MapRegionPath[] {
  const collection = feature(
    topology,
    topology.objects.countries as Topology['objects'][string],
  ) as FeatureCollection<Geometry>

  const projection = geoNaturalEarth1().fitSize([width, height], collection)
  const pathGen = geoPath(projection)

  return collection.features.map((f, index) => {
    const numericId = String(f.id ?? '')
    const catalogKey = catalogKeyFromCountryNumeric(numericId)
    const alpha = catalogKey?.slice('country:'.length) ?? ''
    const inCatalog = alpha !== '' && CATALOG_COUNTRY_CODES.has(alpha)

    return {
      id: numericId ? `world-${numericId}` : `world-idx-${index}`,
      d: pathGen(f) ?? '',
      catalogKey: inCatalog ? catalogKey : null,
      name: typeof f.properties?.name === 'string' ? f.properties.name : numericId,
      kind: inCatalog ? 'country' : 'other',
    }
  })
}

export function buildUsStatePaths(topology: Topology, width: number, height: number): MapRegionPath[] {
  const collection = feature(
    topology,
    topology.objects.states as Topology['objects'][string],
  ) as FeatureCollection<Geometry>

  const projection = geoAlbersUsa().fitSize([width, height], collection)
  const pathGen = geoPath(projection)

  return collection.features.map((f) => {
    const fips = String(f.id ?? '').padStart(2, '0')
    const catalogKey = catalogKeyFromStateFips(fips)
    const alpha = catalogKey?.slice('state:'.length) ?? ''
    const inCatalog = alpha !== '' && CATALOG_STATE_CODES.has(alpha)

    return {
      id: `state-${fips}`,
      d: pathGen(f) ?? '',
      catalogKey: inCatalog ? catalogKey : null,
      name: typeof f.properties?.name === 'string' ? f.properties.name : fips,
      kind: inCatalog ? 'state' : 'other',
    }
  })
}

/** Map match % (0–100) to a fill opacity for recommended destinations. */
export function matchFillOpacity(matchPct: number): number {
  return 0.22 + (matchPct / 100) * 0.58
}
