declare global {
  interface Window {
    sendPrompt?: (message: string) => void
  }
}

/** Sends a prompt to the host assistant when available (e.g. Cursor embed). */
export function sendPrompt(message: string): void {
  if (typeof window.sendPrompt === 'function') {
    window.sendPrompt(message)
    return
  }
  window.dispatchEvent(
    new CustomEvent('app-send-prompt', { detail: message, bubbles: true }),
  )
}
