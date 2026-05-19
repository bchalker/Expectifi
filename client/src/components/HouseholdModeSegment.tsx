import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import './HouseholdModeSegment.scss'

export type HouseholdMode = 'solo' | 'spouse'

type Props = {
  value: HouseholdMode
  onChange: (mode: HouseholdMode) => void
}

const OPTIONS: { id: HouseholdMode; label: string }[] = [
  { id: 'solo', label: 'Just Me' },
  { id: 'spouse', label: 'With Spouse' },
]

export function HouseholdModeSegment({ value, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<HouseholdMode, HTMLButtonElement | null>>({ solo: null, spouse: null })
  const [thumb, setThumb] = useState({ left: 0, width: 0 })

  const measureThumb = useCallback(() => {
    const track = trackRef.current
    const tab = tabRefs.current[value]
    if (!track || !tab) return
    const trackRect = track.getBoundingClientRect()
    const tabRect = tab.getBoundingClientRect()
    setThumb({ left: tabRect.left - trackRect.left, width: tabRect.width })
  }, [value])

  useLayoutEffect(() => {
    measureThumb()
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measureThumb())
    ro.observe(track)
    for (const opt of OPTIONS) {
      const tab = tabRefs.current[opt.id]
      if (tab) ro.observe(tab)
    }
    return () => ro.disconnect()
  }, [measureThumb, value])

  return (
    <div ref={trackRef} className="household-mode-segment" role="group" aria-label="Household planning mode">
      <div
        className="household-mode-segment__thumb"
        aria-hidden
        style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
      />
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          ref={(el) => {
            tabRefs.current[opt.id] = el
          }}
          type="button"
          className={`household-mode-segment__tab${value === opt.id ? ' household-mode-segment__tab--on' : ''}`}
          aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
