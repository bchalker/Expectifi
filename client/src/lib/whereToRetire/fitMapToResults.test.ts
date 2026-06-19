import { describe, expect, it, vi } from 'vitest'
import {
  fitMapToResults,
  MAP_FIT_MAX_ZOOM,
  MAP_FIT_MIN_ZOOM,
  MAP_FIT_PADDING_PX,
  MAP_FIT_SINGLE_CITY_ZOOM,
} from './fitMapToResults'
import type { ScoredMapCity } from './cityMapScoring'

function scoredCity(id: string, lat: number, lng: number): ScoredMapCity {
  return {
    city: { id, city: id, country: 'Test', lat, lng },
  } as ScoredMapCity
}

function createMockMap() {
  const listeners = new Map<string, Set<() => void>>()
  return {
    stop: vi.fn(),
    easeTo: vi.fn(),
    fitBounds: vi.fn(),
    getZoom: vi.fn(() => MAP_FIT_MIN_ZOOM),
    setZoom: vi.fn(),
    once: vi.fn((event: string, handler: () => void) => {
      const set = listeners.get(event) ?? new Set()
      set.add(handler)
      listeners.set(event, set)
    }),
    off: vi.fn(),
    emitMoveEnd: () => {
      listeners.get('moveend')?.forEach((handler) => handler())
    },
  }
}

describe('fitMapToResults', () => {
  it('keeps the current view when there are no results', () => {
    const map = createMockMap()
    fitMapToResults([], map as never)
    expect(map.stop).not.toHaveBeenCalled()
    expect(map.easeTo).not.toHaveBeenCalled()
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it('centers a single city at a regional zoom', () => {
    const map = createMockMap()
    fitMapToResults([scoredCity('Bangkok|Thailand', 13.75, 100.5)], map as never, {
      duration: 0,
    })

    expect(map.easeTo).toHaveBeenCalledWith({
      center: [100.5, 13.75],
      zoom: MAP_FIT_SINGLE_CITY_ZOOM,
      duration: 0,
      essential: true,
    })
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it('fits worldwide spreads with padding and zoom caps', () => {
    const map = createMockMap()
    fitMapToResults(
      [
        scoredCity('New York|United States', 40.7, -74),
        scoredCity('Tokyo|Japan', 35.7, 139.7),
        scoredCity('Sydney|Australia', -33.9, 151.2),
      ],
      map as never,
      { duration: 500 },
    )

    expect(map.fitBounds).toHaveBeenCalledTimes(1)
    const [, options] = map.fitBounds.mock.calls[0]
    expect(options.padding).toBe(MAP_FIT_PADDING_PX)
    expect(options.maxZoom).toBe(MAP_FIT_MAX_ZOOM)
    expect(options.duration).toBe(500)
  })

  it('clamps zoom to the min floor after fitBounds', () => {
    const map = createMockMap()
    map.getZoom = vi.fn(() => 1)
    fitMapToResults(
      [
        scoredCity('Bangkok|Thailand', 13.75, 100.5),
        scoredCity('Chiang Mai|Thailand', 18.8, 98.98),
      ],
      map as never,
    )
    map.emitMoveEnd()
    expect(map.setZoom).toHaveBeenCalledWith(MAP_FIT_MIN_ZOOM)
  })
})
