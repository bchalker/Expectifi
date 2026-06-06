import { useLayoutEffect, useRef, useState } from 'react'

const STUCK_ENTER_PX = 2
const STUCK_EXIT_PX = 8

function measureStickyTopPx(hero: HTMLElement): number {
  const computedTop = parseFloat(getComputedStyle(hero).top)
  if (Number.isFinite(computedTop) && computedTop > 0) return computedTop

  const stack = document.querySelector('.app-header-stack')
  if (stack) {
    const stackHeight = Math.ceil(stack.getBoundingClientRect().height)
    if (stackHeight > 0) return stackHeight
  }

  const measured = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      '--app-measured-header-h',
    ),
  )
  if (Number.isFinite(measured) && measured > 0) return measured

  const chrome = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--app-top-chrome-h'),
  )
  if (Number.isFinite(chrome) && chrome > 0) return chrome

  return 54
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
        const stickyTop =
          stickyTopPx != null && stickyTopPx > 0
            ? stickyTopPx
            : measureStickyTopPx(heroEl)
        const offset = heroEl.getBoundingClientRect().top - stickyTop
        let next = stuckRef.current

        if (stuckRef.current) {
          if (offset > STUCK_EXIT_PX) next = false
        } else if (offset <= STUCK_ENTER_PX && window.scrollY > 0) {
          next = true
        }

        if (next !== stuckRef.current) {
          stuckRef.current = next
          setStuck(next)
        }
      })
    }

    check()
    window.addEventListener('scroll', check, { passive: true })
    document.addEventListener('scroll', check, { passive: true, capture: true })
    window.addEventListener('resize', check, { passive: true })

    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null
    ro?.observe(document.documentElement)

    const stack = document.querySelector('.app-header-stack')
    if (stack && ro) ro.observe(stack)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', check)
      document.removeEventListener('scroll', check, true)
      window.removeEventListener('resize', check)
      ro?.disconnect()
    }
  }, [stickyTopPx, enabled, heroEl])

  return { heroRef: bindHeroRef, stuck }
}
