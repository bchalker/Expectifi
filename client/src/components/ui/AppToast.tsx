import { useEffect, useState } from 'react'
import './AppToast.scss'

type AppToastProps = {
  message: string
  visible: boolean
  onDismiss: () => void
  durationMs?: number
  /** `center` = bottom-center banner; `corner` = compact bottom-right overlay. */
  placement?: 'center' | 'corner'
}

const EXIT_MS = 280

export function AppToast({
  message,
  visible,
  onDismiss,
  durationMs = 4000,
  placement = 'center',
}: AppToastProps) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!visible) {
      setShown(false)
      return
    }
    setShown(true)
    const hideTimer = window.setTimeout(() => setShown(false), durationMs)
    const dismissTimer = window.setTimeout(() => onDismiss(), durationMs + EXIT_MS)
    return () => {
      window.clearTimeout(hideTimer)
      window.clearTimeout(dismissTimer)
    }
  }, [visible, message, durationMs, onDismiss])

  if (!visible && !shown) return null

  return (
    <div
      className={[
        'app-toast',
        placement === 'corner' && 'app-toast--corner',
        shown && 'app-toast--visible',
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
