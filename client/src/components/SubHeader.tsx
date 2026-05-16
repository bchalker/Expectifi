import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAnimatedScalar } from '../hooks/useAnimatedScalar'
import { buildTrendFromAmounts } from '../lib/bucketHoldingTrend'
import { SS_STANDARD_AGES, type SsClaimAge } from '../lib/socialSecurity'
import { fmt } from '../utils/format'
import { BucketTotalTrend } from './ui/BucketTotalTrend'
import './SubHeader.scss'

type Phase = 'growth' | 'income'

type ThumbRect = { left: number; width: number }

/** Growth / Income pill toggle — single sliding thumb (HeroUI Tabs.Indicator mis-animates here). */
function PhaseSegmentTabs({ phase, onPhase }: { phase: Phase; onPhase: (p: Phase) => void }) {
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
  }, [measureThumb])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    onPhase(phase === 'growth' ? 'income' : 'growth')
  }

  return (
    <div
      ref={trackRef}
      className="subheader-phase-segment"
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
        id="subheader-phase-growth"
        aria-selected={phase === 'growth'}
        aria-controls="subheader-phase-growth-panel"
        tabIndex={phase === 'growth' ? 0 : -1}
        className="subheader-phase-segment__tab"
        onClick={() => onPhase('growth')}
      >
        Growth
      </button>
      <button
        ref={incomeRef}
        type="button"
        role="tab"
        id="subheader-phase-income"
        aria-selected={phase === 'income'}
        aria-controls="subheader-phase-income-panel"
        tabIndex={phase === 'income' ? 0 : -1}
        className="subheader-phase-segment__tab"
        onClick={() => onPhase('income')}
      >
        Income
      </button>
    </div>
  )
}

const SUBHEADER_NAVY = '#1c2b3a'

/** Claim age control for income subheader — plain buttons with explicit selected colors. */
function SubheaderClaimAgePicker({ value, onChange }: { value: SsClaimAge; onChange: (age: SsClaimAge) => void }) {
  return (
    <div className="subheader-claim-age" role="group" aria-label="Your Social Security claiming age">
      {SS_STANDARD_AGES.map((age) => {
        const selected = value === age
        return (
          <button
            key={age}
            type="button"
            className="subheader-claim-age__btn"
            aria-pressed={selected}
            style={
              selected
                ? { background: SUBHEADER_NAVY, color: '#fff' }
                : { background: 'transparent', color: 'rgba(0, 0, 0, 0.5)' }
            }
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onChange(age)
            }}
          >
            {age}
          </button>
        )
      })}
    </div>
  )
}

type Props = {
  phase: Phase
  onPhase: (p: Phase) => void
  grossMon: number
  totalFV: number
  targetRetirementAge: number
  annualSave: number
  ssIncluded: boolean
  onSsIncluded: (v: boolean) => void
  ssClaimAge: SsClaimAge
  onSsClaimAgeChange: (age: SsClaimAge) => void
  /** When false, show Add Social Security instead of the toggle. */
  ssTimingConfigured: boolean
  onOpenSsConfig: () => void
  /** When false, header shows $0 — no manual balances or imported positions to project from. */
  hasPortfolioBalances: boolean
  /** Current retirement + taxable balance (growth trend baseline). */
  portfolioNow: number
  /** Portfolio-only monthly withdrawal before SS (income trend baseline). */
  monPort: number
}

/** Back wave (1000×100); fill uses theme token via inline SVG */
const SUBHEADER_WAVE_BACK_D = 'M0 0v100S0 4 500 4s500 96 500 96V0H0Z'
/** Front divider (1000×72) — fill from CSS for income-phase gold transition */
const SUBHEADER_WAVE_FRONT_D = 'M0 0v3c250 0 250 69 500 69S750 3 1000 3V0H0Z'

export function SubHeader({
  phase,
  onPhase,
  grossMon,
  totalFV,
  targetRetirementAge,
  annualSave,
  ssIncluded,
  onSsIncluded,
  ssClaimAge,
  onSsClaimAgeChange,
  ssTimingConfigured,
  onOpenSsConfig,
  hasPortfolioBalances,
  portfolioNow,
  monPort,
}: Props) {
  const grossAnim = useAnimatedScalar(grossMon)
  const totalFvAnim = useAnimatedScalar(totalFV)
  const prevHeroEndRef = useRef<number | null>(null)

  const incomePhase = phase === 'income'

  const heroTrend = useMemo(() => {
    if (!hasPortfolioBalances) return null
    if (incomePhase) {
      if (!(monPort > 0) || !(grossMon > 0)) return null
      return buildTrendFromAmounts(monPort, grossMon)
    }
    const end = totalFV
    const last = prevHeroEndRef.current
    const start = last != null && last > 0 && last !== end ? last : portfolioNow
    if (!(start > 0) || !(end > 0)) return null
    return buildTrendFromAmounts(start, end)
  }, [hasPortfolioBalances, incomePhase, monPort, grossMon, portfolioNow, totalFV])

  useEffect(() => {
    prevHeroEndRef.current = incomePhase ? grossMon : totalFV
  }, [incomePhase, grossMon, totalFV])

  const showSsClaimPicker = incomePhase && ssTimingConfigured && ssIncluded
  /** Reserve hero height/padding when SS is configured so toggling include does not shift the amount. */
  const reserveSsClaimSlot = incomePhase && ssTimingConfigured

  return (
    <header
      className={`subheader${incomePhase ? ' subheader--phase-income' : ''}${reserveSsClaimSlot ? ' subheader--ss-claim-slot' : ''}${!hasPortfolioBalances ? ' subheader--no-balances' : ''}`}
    >
      <div className="subheader-waves">
        <div className="subheader-waves__bubbles" aria-hidden>
          <svg
            className="subheader-bubble subheader-bubble--back"
            viewBox="0 0 1000 100"
            preserveAspectRatio="xMidYMax slice"
          >
            <path d={SUBHEADER_WAVE_BACK_D} fill="var(--nav-bg)" />
          </svg>
          <div className="subheader-waves__front-scale">
            <svg
              className="subheader-bubble subheader-bubble--front"
              viewBox="0 0 1000 72"
              preserveAspectRatio="xMidYMax slice"
            >
              <path className="subheader-bubble__front-path" d={SUBHEADER_WAVE_FRONT_D} />
            </svg>
          </div>
        </div>
      </div>
      {hasPortfolioBalances ? (
        <div className="subheader-content">
        <div className="subheader-estimate" aria-live="polite">
          <div className="subheader-estimate__top">
            <PhaseSegmentTabs phase={phase} onPhase={onPhase} />
            <div id="subheader-phase-growth-panel" className="subheader-phase-segment__sr" role="tabpanel" hidden={phase !== 'growth'}>
              Growth phase
            </div>
            <div id="subheader-phase-income-panel" className="subheader-phase-segment__sr" role="tabpanel" hidden={phase !== 'income'}>
              Income phase
            </div>
          </div>

          <div className="subheader-estimate__center">
            <div key={phase} className="subheader-estimate__swap">
              <div className="subheader-estimate__value subheader-estimate__value--enter">
                <span className="subheader-estimate__value-num">
                  {incomePhase ? fmt(grossAnim) : fmt(totalFvAnim)}
                </span>
                <span className="subheader-estimate__value-suffix">
                  {incomePhase ? '/mo' : `/at ${targetRetirementAge}`}
                </span>
              </div>
              {heroTrend ? (
                <div className="subheader-estimate__hero-trend" aria-hidden>
                  <BucketTotalTrend trend={heroTrend} tone="on-dark" layout="stack" showChart showPercent={false} />
                </div>
              ) : null}
              <div className="subheader-estimate__meta">
                {incomePhase ? (
                  <>
                    <div className="subheader-ss-block">
                    <div
                      className="subheader-estimate__note subheader-estimate__note--ss-row"
                      role="group"
                      aria-label="Include Social Security in expected monthly income"
                    >
                      {ssTimingConfigured ? (
                        <>
                          <span className="font-xs subheader-ss-toggle__text">Include Social Security</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={ssIncluded}
                            aria-label="Include Social Security in expected monthly income"
                            className={`subheader-ss-toggle__switch${ssIncluded ? ' subheader-ss-toggle__switch--on' : ''}`}
                            onClick={() => onSsIncluded(!ssIncluded)}
                          >
                            <span className="subheader-ss-toggle__track" aria-hidden />
                          </button>
                        </>
                      ) : (
                        <button type="button" className="font-xs subheader-ss-add-btn" onClick={onOpenSsConfig}>
                          Add Social Security
                        </button>
                      )}
                    </div>
                  </div>
                  </>
                ) : (
                  <span className="subheader-estimate__note subheader-estimate__note--enter">
                    {annualSave > 0
                      ? `Adding ${fmt(annualSave)} per year in contributions`
                      : 'No annual contributions'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {reserveSsClaimSlot ? (
            <div className="subheader-estimate__bottom">
              <div
                className={`subheader-estimate__claim-reveal${showSsClaimPicker ? ' subheader-estimate__claim-reveal--visible' : ''}`}
                aria-hidden={!showSsClaimPicker}
              >
                <SubheaderClaimAgePicker value={ssClaimAge} onChange={onSsClaimAgeChange} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      ) : null}
    </header>
  )
}
