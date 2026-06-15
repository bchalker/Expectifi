import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { Intensity } from '../../utils/costOfLiving'
import './IntensitySelector.scss'

const INTENSITY_OPTIONS: { id: Intensity; label: string }[] = [
  { id: 'lean', label: 'Lean' },
  { id: 'typical', label: 'Typical' },
  { id: 'comfortable', label: 'Comfortable' },
]

export const INTENSITY_DESCRIPTIONS: Record<Intensity, string> = {
  lean: 'Mostly essentials — home cooking, low-key weekends, and little room for extras.',
  typical: 'Everyday balance — some dining out, a gym membership, and regular social outings.',
  comfortable: 'Live generously — restaurants, entertainment, and travel without much scrimping.',
}

type ThumbRect = { left: number; width: number }

type Props = {
  value: Intensity
  onChange: (intensity: Intensity) => void
  variant?: 'full' | 'compact'
  className?: string
  ariaLabel?: string
  showDescription?: boolean
}

export function IntensitySelector({
  value,
  onChange,
  variant = 'full',
  className,
  ariaLabel = 'Spending intensity',
  showDescription = true,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Partial<Record<Intensity, HTMLButtonElement>>>({})
  const [thumb, setThumb] = useState<ThumbRect>({ left: 0, width: 0 })

  const measureThumb = useCallback(() => {
    const track = trackRef.current
    const tab = buttonRefs.current[value]
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
    return () => ro.disconnect()
  }, [measureThumb])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const idx = INTENSITY_OPTIONS.findIndex((opt) => opt.id === value)
    if (idx < 0) return
    if (event.key === 'ArrowLeft' && idx > 0) {
      event.preventDefault()
      onChange(INTENSITY_OPTIONS[idx - 1].id)
    }
    if (event.key === 'ArrowRight' && idx < INTENSITY_OPTIONS.length - 1) {
      event.preventDefault()
      onChange(INTENSITY_OPTIONS[idx + 1].id)
    }
  }

  return (
    <div
      className={[
        'wtr-intensity-selector',
        variant === 'compact' && 'wtr-intensity-selector--compact',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        ref={trackRef}
        className="wtr-intensity-selector__track"
        role="radiogroup"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
      >
        <div
          className="wtr-intensity-selector__thumb"
          aria-hidden
          style={{
            transform: `translateX(${thumb.left}px)`,
            width: thumb.width,
          }}
        />
        {INTENSITY_OPTIONS.map((option) => (
          <button
            key={option.id}
            ref={(el) => {
              buttonRefs.current[option.id] = el ?? undefined
            }}
            type="button"
            role="radio"
            className="wtr-intensity-selector__btn"
            aria-checked={value === option.id}
            tabIndex={value === option.id ? 0 : -1}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {showDescription ? (
        <p className="wtr-intensity-selector__desc">{INTENSITY_DESCRIPTIONS[value]}</p>
      ) : null}
    </div>
  )
}
