import { useCallback, useState } from 'react'
import {
  readMapPinColorView,
  writeMapPinColorView,
  type MapPinColorView,
} from '../lib/whereToRetire/mapPinDisplay'

export function useMapPinColorView() {
  const [pinColorView, setPinColorView] = useState<MapPinColorView>(readMapPinColorView)

  const onPinColorViewChange = useCallback((view: MapPinColorView) => {
    setPinColorView(view)
    writeMapPinColorView(view)
  }, [])

  return { pinColorView, onPinColorViewChange }
}
