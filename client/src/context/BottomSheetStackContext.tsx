import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { MOBILE_BOTTOM_SHEET_MQ, useIsMobileBottomSheet } from '../hooks/useMobileBottomSheet'

const SCALE_SURFACE_ID = 'app-scale-surface'
const SCALE_SURFACE_CLASS = 'app-scale-surface--behind'

type BottomSheetStackContextValue = {
  register: () => () => void
}

const BottomSheetStackContext = createContext<BottomSheetStackContextValue | null>(
  null,
)

function syncScaleSurfaceClass(openCount: number) {
  const surface = document.getElementById(SCALE_SURFACE_ID)
  if (!surface) return

  const mobile =
    typeof window !== 'undefined' &&
    window.matchMedia(MOBILE_BOTTOM_SHEET_MQ).matches

  surface.classList.toggle(SCALE_SURFACE_CLASS, openCount > 0 && mobile)
}

export function BottomSheetStackProvider({ children }: { children: ReactNode }) {
  const [openCount, setOpenCount] = useState(0)

  const register = useCallback(() => {
    setOpenCount((count) => count + 1)
    return () => setOpenCount((count) => Math.max(0, count - 1))
  }, [])

  useEffect(() => {
    syncScaleSurfaceClass(openCount)
  }, [openCount])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(MOBILE_BOTTOM_SHEET_MQ)
    const onChange = () => syncScaleSurfaceClass(openCount)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [openCount])

  useEffect(
    () => () => {
      document.getElementById(SCALE_SURFACE_ID)?.classList.remove(SCALE_SURFACE_CLASS)
    },
    [],
  )

  const value = useMemo(() => ({ register }), [register])

  return (
    <BottomSheetStackContext.Provider value={value}>
      <div id={SCALE_SURFACE_ID} className="app-scale-surface">
        {children}
      </div>
    </BottomSheetStackContext.Provider>
  )
}

/** Register an open mobile bottom sheet so app content scales down (ref-counted). */
export function useBottomSheetStackRegistration(isOpen: boolean) {
  const ctx = useContext(BottomSheetStackContext)
  const isMobileSheet = useIsMobileBottomSheet()
  const unregisterRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!ctx) return

    if (isOpen && isMobileSheet) {
      if (!unregisterRef.current) {
        unregisterRef.current = ctx.register()
      }
      return
    }

    unregisterRef.current?.()
    unregisterRef.current = null
  }, [ctx, isOpen, isMobileSheet])

  useEffect(
    () => () => {
      unregisterRef.current?.()
      unregisterRef.current = null
    },
    [],
  )
}
