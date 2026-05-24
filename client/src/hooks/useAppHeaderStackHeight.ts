import { useLayoutEffect, useState } from 'react'

function readHeaderStackHeight(): number | null {
  if (typeof document === 'undefined') return null
  const stack = document.querySelector('.app-header-stack')
  if (!stack) return null
  const height = Math.ceil(stack.getBoundingClientRect().height)
  return height > 0 ? height : null
}

/** Live .app-header-stack height in px; also syncs --app-measured-header-h on :root. */
export function useAppHeaderStackHeight(): number | null {
  const [height, setHeight] = useState<number | null>(readHeaderStackHeight)

  useLayoutEffect(() => {
    const stack = document.querySelector('.app-header-stack')
    if (!stack) return

    const sync = () => {
      const next = Math.ceil(stack.getBoundingClientRect().height)
      setHeight(next)
      document.documentElement.style.setProperty('--app-measured-header-h', `${next}px`)
    }

    sync()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null
    ro?.observe(stack)
    window.addEventListener('resize', sync)

    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', sync)
      document.documentElement.style.removeProperty('--app-measured-header-h')
    }
  }, [])

  return height
}
