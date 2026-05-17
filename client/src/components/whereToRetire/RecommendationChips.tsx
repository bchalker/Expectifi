import { useCallback, useEffect, useRef, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconCirclePlus } from '@tabler/icons-react'
import type { ScoredDestination } from '../../lib/destinationScorer'
import { fmtSignedMonthly } from '../../utils/format'
import { DestinationMark } from './DestinationMark'
import './RecommendationChips.scss'

type Props = {
  chips: ScoredDestination[]
  onAdd: (key: string) => void
}

export function RecommendationChips({ chips, onAdd }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollAffordance = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(maxScroll > 2 && el.scrollLeft < maxScroll - 2)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollAffordance()
    el.addEventListener('scroll', updateScrollAffordance, { passive: true })
    const ro = new ResizeObserver(updateScrollAffordance)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateScrollAffordance)
      ro.disconnect()
    }
  }, [chips.length, updateScrollAffordance])

  const scrollByChip = useCallback(
    (direction: -1 | 1) => {
      const el = scrollRef.current
      if (!el) return
      const firstChip = el.querySelector<HTMLElement>('.wtr-chips__chip')
      const gap = Number.parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap || '8') || 8
      const step = firstChip ? firstChip.offsetWidth + gap : el.clientWidth * 0.85
      el.scrollBy({ left: direction * step, behavior: 'smooth' })
    },
    [],
  )

  if (!chips.length) return null

  const showNav = canScrollLeft || canScrollRight

  return (
    <section className="wtr-chips" aria-label="Recommended destinations">
      <div
        className={[
          'wtr-chips__frame',
          showNav && 'wtr-chips__frame--has-nav',
          canScrollLeft && 'wtr-chips__frame--fade-left',
          canScrollRight && 'wtr-chips__frame--fade-right',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {showNav ? (
          <>
            <button
              type="button"
              className="wtr-chips__nav-btn wtr-chips__nav-btn--prev"
              aria-label="Scroll to previous recommendations"
              disabled={!canScrollLeft}
              onClick={() => scrollByChip(-1)}
            >
              <IconChevronLeft size={20} stroke={1.5} aria-hidden />
            </button>
            <button
              type="button"
              className="wtr-chips__nav-btn wtr-chips__nav-btn--next"
              aria-label="Scroll to next recommendations"
              disabled={!canScrollRight}
              onClick={() => scrollByChip(1)}
            >
              <IconChevronRight size={20} stroke={1.5} aria-hidden />
            </button>
          </>
        ) : null}
        <div ref={scrollRef} className="wtr-chips__scroll" tabIndex={showNav ? 0 : undefined}>
          {chips.map((chip) => {
            const pos = chip.surplus >= 0
            return (
              <button
                key={chip.key}
                type="button"
                className="wtr-chips__chip"
                title={`Add ${chip.entry.name} to comparison`}
                onClick={() => onAdd(chip.key)}
              >
                <span className="wtr-chips__viewport">
                  <span className="wtr-chips__slider">
                    <span className="wtr-chips__slide wtr-chips__slide--info">
                      <span className="wtr-chips__mark" aria-hidden>
                        <DestinationMark entry={chip.entry} />
                      </span>
                      <span className="wtr-chips__body">
                        <span className="wtr-chips__name">{chip.entry.name}</span>
                        <span className={`wtr-chips__surplus wtr-chips__surplus--${pos ? 'pos' : 'neg'}`}>
                          {fmtSignedMonthly(chip.surplus)}
                        </span>
                      </span>
                    </span>
                    <span className="wtr-chips__slide wtr-chips__slide--add" aria-hidden>
                      <IconCirclePlus size={18} stroke={1.5} className="wtr-chips__add-icon" />
                      <span className="wtr-chips__add-label">Add to table</span>
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
