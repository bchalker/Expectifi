import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { SsClaimAge } from '../lib/socialSecurity'
import { SS_STANDARD_AGES } from '../lib/socialSecurity'
import './ClaimAgeSegment.scss'

type Props = {
  value: SsClaimAge
  onChange: (age: SsClaimAge) => void
  ariaLabel: string
  /** White track + navy selected pill (income subheader on gold). */
  tone?: 'default' | 'subheader'
}

export function ClaimAgeSegment({ value, onChange, ariaLabel, tone = 'default' }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<SsClaimAge, HTMLButtonElement | null>>({ 62: null, 67: null, 70: null })
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
    let cancelled = false
    const run = () => {
      if (!cancelled) measureThumb()
    }
    run()
    const raf = requestAnimationFrame(() => {
      run()
      requestAnimationFrame(run)
    })
    const t = window.setTimeout(run, 520)
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') {
      return () => {
        cancelled = true
        cancelAnimationFrame(raf)
        window.clearTimeout(t)
      }
    }
    const ro = new ResizeObserver(() => run())
    ro.observe(track)
    for (const age of SS_STANDARD_AGES) {
      const tab = tabRefs.current[age]
      if (tab) ro.observe(tab)
    }
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
      ro.disconnect()
    }
  }, [measureThumb, value])

  return (
    <div
      ref={trackRef}
      className={`claim-age-segment${tone === 'subheader' ? ' claim-age-segment--subheader' : ''}`}
      role="group"
      aria-label={ariaLabel}
    >
      <div
        className="claim-age-segment__thumb"
        aria-hidden
        style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
      />
      {SS_STANDARD_AGES.map((age) => (
        <button
          key={age}
          ref={(el) => {
            tabRefs.current[age] = el
          }}
          type="button"
          className={`claim-age-segment__tab${value === age ? ' claim-age-segment__tab--on' : ''}`}
          aria-pressed={value === age}
          onClick={() => onChange(age)}
        >
          {age}
        </button>
      ))}
    </div>
  )
}
