/** Departure country for the direct-flights map filter. */
export type DirectFlightOrigin = 'us' | 'uk' | 'canada' | 'australia'

export const DIRECT_FLIGHT_ORIGIN_OPTIONS: {
  id: DirectFlightOrigin
  label: string
}[] = [
  { id: 'us', label: 'United States' },
  { id: 'uk', label: 'United Kingdom' },
  { id: 'canada', label: 'Canada' },
  { id: 'australia', label: 'Australia' },
]

export function directFlightOriginLabel(origin: DirectFlightOrigin): string {
  return (
    DIRECT_FLIGHT_ORIGIN_OPTIONS.find((opt) => opt.id === origin)?.label ??
    'United States'
  )
}
