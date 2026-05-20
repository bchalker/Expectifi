import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import type { DestinationCatalogEntry } from '../../data/destinations'
import { getCatalogEntry } from '../../data/destinations'
import type { ScoredDestination } from '../../lib/destinationScorer'
import {
  buildUsStatePaths,
  buildWorldPaths,
  fetchUsStatesTopology,
  fetchWorldTopology,
  matchFillOpacity,
  type MapRegionPath,
} from '../../lib/whereToRetire/destinationMapGeo'
import { fmtSignedMonthly } from '../../utils/format'
import './DestinationMapView.scss'

type Props = {
  scored: ScoredDestination[]
  selectedKeys: string[]
  onSelect: (entry: DestinationCatalogEntry) => void
}

type TooltipState = {
  x: number
  y: number
  name: string
  surplus: number | null
  matchPct: number | null
  selected: boolean
  inComparison: boolean
}

const WORLD_WIDTH = 960
const WORLD_HEIGHT = 500
const US_WIDTH = 960
const US_HEIGHT = 560

function MapSvg({
  paths,
  viewWidth,
  viewHeight,
  scoredByKey,
  selectedSet,
  ariaLabel,
  onRegionClick,
  onRegionHover,
  onRegionLeave,
}: {
  paths: MapRegionPath[]
  viewWidth: number
  viewHeight: number
  scoredByKey: Map<string, ScoredDestination>
  selectedSet: Set<string>
  ariaLabel: string
  onRegionClick: (path: MapRegionPath) => void
  onRegionHover: (path: MapRegionPath, event: MouseEvent<SVGPathElement>) => void
  onRegionLeave: () => void
}) {
  return (
    <svg
      className="wtr-map__svg"
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      {paths.map((region) => {
        const scored = region.catalogKey ? scoredByKey.get(region.catalogKey) : undefined
        const selected = region.catalogKey ? selectedSet.has(region.catalogKey) : false
        const interactive = region.catalogKey != null

        return (
          <path
            key={region.id}
            d={region.d}
            className={[
              'wtr-map__region',
              region.kind === 'other' && 'wtr-map__region--other',
              interactive && !scored && 'wtr-map__region--catalog',
              interactive && 'wtr-map__region--interactive',
              selected && 'wtr-map__region--selected',
              scored && !selected && 'wtr-map__region--scored',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              scored && !selected
                ? ({
                    '--wtr-map-accent-mix': `${Math.round(matchFillOpacity(scored.matchPct) * 100)}%`,
                  } as CSSProperties)
                : undefined
            }
            tabIndex={interactive ? 0 : undefined}
            aria-label={
              interactive
                ? `${region.name}${selected ? ', in comparison' : ', click to add'}`
                : undefined
            }
            onClick={interactive ? () => onRegionClick(region) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onRegionClick(region)
                    }
                  }
                : undefined
            }
            onMouseEnter={interactive ? (e) => onRegionHover(region, e) : undefined}
            onMouseMove={interactive ? (e) => onRegionHover(region, e) : undefined}
            onMouseLeave={interactive ? onRegionLeave : undefined}
            onFocus={interactive ? (e) => onRegionHover(region, e as unknown as MouseEvent<SVGPathElement>) : undefined}
            onBlur={interactive ? onRegionLeave : undefined}
          />
        )
      })}
    </svg>
  )
}

export function DestinationMapView({ scored, selectedKeys, onSelect }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [worldPaths, setWorldPaths] = useState<MapRegionPath[]>([])
  const [usPaths, setUsPaths] = useState<MapRegionPath[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const scoredByKey = useMemo(() => new Map(scored.map((s) => [s.key, s])), [scored])
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const [worldTopology, usTopology] = await Promise.all([
          fetchWorldTopology(),
          fetchUsStatesTopology(),
        ])
        if (cancelled) return
        setWorldPaths(buildWorldPaths(worldTopology, WORLD_WIDTH, WORLD_HEIGHT))
        setUsPaths(buildUsStatePaths(usTopology, US_WIDTH, US_HEIGHT))
      } catch {
        if (!cancelled) setLoadError('Could not load map data. Try refreshing the page.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const positionTooltip = useCallback((clientX: number, clientY: number) => {
    const root = rootRef.current
    if (!root) return { x: clientX, y: clientY }
    const rect = root.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const handleRegionHover = useCallback(
    (region: MapRegionPath, event: MouseEvent<SVGPathElement>) => {
      if (!region.catalogKey) return
      const scoredEntry = scoredByKey.get(region.catalogKey)
      const { x, y } = positionTooltip(event.clientX, event.clientY)
      setTooltip({
        x,
        y,
        name: region.name,
        surplus: scoredEntry?.surplus ?? null,
        matchPct: scoredEntry?.matchPct ?? null,
        selected: selectedSet.has(region.catalogKey),
        inComparison: selectedSet.has(region.catalogKey),
      })
    },
    [positionTooltip, scoredByKey, selectedSet],
  )

  const handleRegionLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  const handleRegionClick = useCallback(
    (region: MapRegionPath) => {
      if (!region.catalogKey || selectedSet.has(region.catalogKey)) return
      const entry = getCatalogEntry(region.catalogKey)
      if (entry) onSelect(entry)
    },
    [onSelect, selectedSet],
  )

  if (loading) {
    return (
      <div className="wtr-map wtr-map--loading" aria-busy="true" aria-label="Loading map">
        <p className="wtr-map__status">Loading map…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="wtr-map wtr-map--error" role="alert">
        <p className="wtr-map__status">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="wtr-map" ref={rootRef}>
      <div className="wtr-map__legend" aria-hidden>
        <span className="wtr-map__legend-item">
          <span className="wtr-map__legend-swatch wtr-map__legend-swatch--scored" />
          Recommended
        </span>
        <span className="wtr-map__legend-item">
          <span className="wtr-map__legend-swatch wtr-map__legend-swatch--selected" />
          In comparison
        </span>
      </div>

      <section className="wtr-map__panel" aria-labelledby="wtr-map-world-heading">
        <h2 id="wtr-map-world-heading" className="wtr-map__panel-title">
          International destinations
        </h2>
        <div className="wtr-map__canvas wtr-map__canvas--world">
          <MapSvg
            paths={worldPaths}
            viewWidth={WORLD_WIDTH}
            viewHeight={WORLD_HEIGHT}
            scoredByKey={scoredByKey}
            selectedSet={selectedSet}
            ariaLabel="World map of international retirement destinations"
            onRegionClick={handleRegionClick}
            onRegionHover={handleRegionHover}
            onRegionLeave={handleRegionLeave}
          />
        </div>
      </section>

      <section className="wtr-map__panel" aria-labelledby="wtr-map-us-heading">
        <h2 id="wtr-map-us-heading" className="wtr-map__panel-title">
          US states
        </h2>
        <div className="wtr-map__canvas wtr-map__canvas--us">
          <MapSvg
            paths={usPaths}
            viewWidth={US_WIDTH}
            viewHeight={US_HEIGHT}
            scoredByKey={scoredByKey}
            selectedSet={selectedSet}
            ariaLabel="United States map of state retirement destinations"
            onRegionClick={handleRegionClick}
            onRegionHover={handleRegionHover}
            onRegionLeave={handleRegionLeave}
          />
        </div>
      </section>

      <p className="wtr-map__hint">
        Click a highlighted country or state to add it to your comparison. Switch to List View to see
        the full table.
      </p>

      {tooltip ? (
        <div
          className="wtr-map__tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          <span className="wtr-map__tooltip-name">{tooltip.name}</span>
          {tooltip.surplus != null ? (
            <span
              className={`wtr-map__tooltip-surplus${tooltip.surplus >= 0 ? '' : ' wtr-map__tooltip-surplus--neg'}`}
            >
              {fmtSignedMonthly(tooltip.surplus)}/mo surplus
            </span>
          ) : null}
          {tooltip.matchPct != null ? (
            <span className="wtr-map__tooltip-match">{tooltip.matchPct}% match</span>
          ) : null}
          {tooltip.inComparison ? (
            <span className="wtr-map__tooltip-note">In comparison</span>
          ) : (
            <span className="wtr-map__tooltip-note">Click to add</span>
          )}
        </div>
      ) : null}
    </div>
  )
}
