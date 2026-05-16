import { useEffect, useState } from 'react'
import { normalizeAppPath } from '../lib/appPaths'

export function useAppPath(): string {
  const [path, setPath] = useState(() =>
    typeof window !== 'undefined' ? normalizeAppPath(window.location.pathname) : '/',
  )

  useEffect(() => {
    const sync = () => setPath(normalizeAppPath(window.location.pathname))
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return path
}
