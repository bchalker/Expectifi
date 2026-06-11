import { useEffect, useState } from 'react'
import './AppToast.scss'

type AppToastProps = {
  message: string
  visible: boolean
  onDismiss: () => void
  durationMs?: number
}

export function AppToast({ message, visible, onDismiss, durationMs = 4000 }: AppToastProps) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!visible) {
      setShown(false)
      return
    }
    setShown(true)
    const id = window.setTimeout(() => {
      setShown(false)
      onDismiss()
    }, durationMs)
    return () => window.clearTimeout(id)
  }, [visible, message, durationMs, onDismiss])

  if (!visible && !shown) return null

  return (
    <div
      className={['app-toast', shown && 'app-toast--visible'].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
