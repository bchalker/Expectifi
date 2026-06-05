import { type RefObject, useEffect } from 'react'

export type UseClickOutsideOptions = {
  /** Ignore events that originate inside a matching element (e.g. popover triggers). */
  ignoreClosest?: string
}

/** Calls `onOutside` when a pointer event occurs outside `ref` (and outside `ignoreRefs`). */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutside: () => void,
  active: boolean,
  ignoreRefs?: ReadonlyArray<RefObject<HTMLElement | null>>,
  options?: UseClickOutsideOptions,
) {
  useEffect(() => {
    if (!active) return
    function isIgnored(target: EventTarget | null) {
      if (!(target instanceof Element)) return false
      if (options?.ignoreClosest && target.closest(options.ignoreClosest)) return true
      for (const r of ignoreRefs ?? []) {
        if (r.current?.contains(target)) return true
      }
      return false
    }
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const el = ref.current
      const t = e.target
      if (!el || el.contains(t as Node) || isIgnored(t)) return
      onOutside()
    }
    document.addEventListener('mousedown', onPointerDown, true)
    document.addEventListener('touchstart', onPointerDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true)
      document.removeEventListener('touchstart', onPointerDown, true)
    }
  }, [ref, onOutside, active, ignoreRefs, options?.ignoreClosest])
}
