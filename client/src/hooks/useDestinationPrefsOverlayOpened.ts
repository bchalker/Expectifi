import { useEffect, useState } from 'react'
import {
  DESTINATION_PREFS_OVERLAY_OPENED_EVENT,
  hasOpenedDestinationPrefsOverlay,
} from '../types/preferences'

export function useDestinationPrefsOverlayOpened(): boolean {
  const [opened, setOpened] = useState(() => hasOpenedDestinationPrefsOverlay())

  useEffect(() => {
    const onOpened = () => setOpened(true)
    window.addEventListener(DESTINATION_PREFS_OVERLAY_OPENED_EVENT, onOpened)
    return () => window.removeEventListener(DESTINATION_PREFS_OVERLAY_OPENED_EVENT, onOpened)
  }, [])

  return opened
}
