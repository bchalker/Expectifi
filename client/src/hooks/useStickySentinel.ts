import { useLayoutEffect, useRef, useState } from 'react'

const STUCK_ENTER_PX = 2
const STUCK_EXIT_PX = 8

function getAppScrollViewport(): HTMLElement | null {
  return document.querySelector('.app-scroll-stack [data-overlayscrollbars-viewport]')
}

function readScrollTop(viewport: HTMLElement | null): number {
  if (viewport) return viewport.scrollTop
  return window.scrollY
}

function measureStickyTopPx(hero: HTMLElement): number {
  const computedTop = parseFloat(getComputedStyle(hero).top)
  if (Number.isFinite(computedTop)) return computedTop

  return 0
}

/** True when a position:sticky element is pinned at its computed top offset. */
export function useStickySentinel(stickyTopPx: number | null, enabled = true) {
  const heroRef = useRef<HTMLDivElement | null>(null)
  const stuckRef = useRef(false)
  const [heroEl, setHeroEl] = useState<HTMLDivElement | null>(null)
  const [stuck, setStuck] = useState(false)

  const bindHeroRef = (node: HTMLDivElement | null) => {
    heroRef.current = node
    setHeroEl(node)
  }

  useLayoutEffect(() => {
    if (!enabled || !heroEl) {
      stuckRef.current = false
      setStuck(false)
      return
    }

    let raf = 0
    const check = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const viewport = getAppScrollViewport()
        const stickyTop =
          stickyTopPx != null ? stickyTopPx : measureStickyTopPx(heroEl)
        const offset = heroEl.getBoundingClientRect().top - stickyTop
        const scrollTop = readScrollTop(viewport)
        let next = stuckRef.current

        if (stuckRef.current) {
          if (offset > STUCK_EXIT_PX) next = false
        } else if (offset <= STUCK_ENTER_PX && scrollTop > 0) {
          next = true
        }

        if (next !== stuckRef.current) {
          stuckRef.current = next
          setStuck(next)
        }
      })
    }

    check()

    const viewport = getAppScrollViewport()
    viewport?.addEventListener('scroll', check, { passive: true })
    window.addEventListener('scroll', check, { passive: true })
    document.addEventListener('scroll', check, { passive: true, capture: true })
    window.addEventListener('resize', check, { passive: true })

    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null
    ro?.observe(document.documentElement)

    const stack = document.querySelector('.app-header-stack')
    if (stack && ro) ro.observe(stack)

    const scrollHost = document.querySelector('.app-scroll-stack')
    if (scrollHost && ro) ro.observe(scrollHost)

    return () => {
      cancelAnimationFrame(raf)
      viewport?.removeEventListener('scroll', check)
      window.removeEventListener('scroll', check)
      document.removeEventListener('scroll', check, true)
      window.removeEventListener('resize', check)
      ro?.disconnect()
    }
  }, [stickyTopPx, enabled, heroEl])

  return { heroRef: bindHeroRef, stuck }
}
