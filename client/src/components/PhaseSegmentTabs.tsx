import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import './PhaseSegmentTabs.scss'

export type PhaseSegment = 'growth' | 'income'

type ThumbRect = { left: number; width: number }

type Props = {
  phase: PhaseSegment
  onPhase: (phase: PhaseSegment) => void
  targetRetirementAge: number
  instanceId?: string
  incomePhase?: boolean
  /** When false, show only "Growth" / "Income" (no "til 62" / "at 62"). */
  showAge?: boolean
}

/** Growth / Income pill toggle — single sliding thumb (HeroUI Tabs.Indicator mis-animates here). */
export function PhaseSegmentTabs({
  phase,
  onPhase,
  targetRetirementAge,
  instanceId,
  incomePhase = false,
  showAge = true,
}: Props) {
  const idSuffix = instanceId ? `-${instanceId}` : ''
  const trackRef = useRef<HTMLDivElement>(null)
  const growthRef = useRef<HTMLButtonElement>(null)
  const incomeRef = useRef<HTMLButtonElement>(null)
  const [thumb, setThumb] = useState<ThumbRect>({ left: 0, width: 0 })

  const measureThumb = useCallback(() => {
    const track = trackRef.current
    const tab = phase === 'growth' ? growthRef.current : incomeRef.current
    if (!track || !tab) return
    const trackRect = track.getBoundingClientRect()
    const tabRect = tab.getBoundingClientRect()
    setThumb({ left: tabRect.left - trackRect.left, width: tabRect.width })
  }, [phase])

  useLayoutEffect(() => {
    measureThumb()
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measureThumb())
    ro.observe(track)
    return () => ro.disconnect()
  }, [measureThumb, targetRetirementAge])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    onPhase(phase === 'growth' ? 'income' : 'growth')
  }

  return (
    <>
      <div
        ref={trackRef}
        className={[
          'subheader-phase-segment',
          incomePhase && 'subheader-phase-segment--income',
        ]
          .filter(Boolean)
          .join(' ')}
        role="tablist"
        aria-label="Show portfolio growth total or retirement income"
        onKeyDown={onKeyDown}
      >
        <div
          className="subheader-phase-segment__thumb"
          aria-hidden
          style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
        />
        <button
          ref={growthRef}
          type="button"
          role="tab"
          id={`subheader-phase-growth${idSuffix}`}
          aria-selected={phase === 'growth'}
          aria-controls={`subheader-phase-growth-panel${idSuffix}`}
          tabIndex={phase === 'growth' ? 0 : -1}
          className={[
            'subheader-phase-segment__tab',
            showAge && phase === 'growth' ? 'subheader-phase-segment__tab--has-suffix' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onPhase('growth')}
        >
          <span className="subheader-phase-segment__tab-label">
            <span className="subheader-phase-segment__tab-word">Growth</span>
            {showAge && phase === 'growth' ? (
              <>
                {' '}
                <span className="subheader-phase-segment__tab-age-qualifier">
                  til
                </span>{' '}
                <span className="subheader-phase-segment__tab-age">
                  {targetRetirementAge}
                </span>
              </>
            ) : null}
          </span>
        </button>
        <button
          ref={incomeRef}
          type="button"
          role="tab"
          id={`subheader-phase-income${idSuffix}`}
          aria-selected={phase === 'income'}
          aria-controls={`subheader-phase-income-panel${idSuffix}`}
          tabIndex={phase === 'income' ? 0 : -1}
          className={[
            'subheader-phase-segment__tab',
            showAge && phase === 'income' ? 'subheader-phase-segment__tab--has-suffix' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onPhase('income')}
        >
          <span className="subheader-phase-segment__tab-label">
            <span className="subheader-phase-segment__tab-word">Income</span>
            {showAge && phase === 'income' ? (
              <>
                {' '}
                <span className="subheader-phase-segment__tab-age-qualifier">
                  at
                </span>{' '}
                <span className="subheader-phase-segment__tab-age">
                  {targetRetirementAge}
                </span>
              </>
            ) : null}
          </span>
        </button>
      </div>
      <div
        id={`subheader-phase-growth-panel${idSuffix}`}
        className="subheader-phase-segment__sr"
        role="tabpanel"
        hidden={phase !== 'growth'}
      >
        Growth phase
      </div>
      <div
        id={`subheader-phase-income-panel${idSuffix}`}
        className="subheader-phase-segment__sr"
        role="tabpanel"
        hidden={phase !== 'income'}
      >
        Income phase
      </div>
    </>
  )
}
