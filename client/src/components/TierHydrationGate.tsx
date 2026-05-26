import type { ReactNode } from 'react'
import { useUserTier } from '../hooks/useUserTier'

export function TierHydrationGate({ children }: { children: ReactNode }) {
  const { isHydrated } = useUserTier()
  if (!isHydrated) {
    return <div className="app-root-loading" aria-busy="true" aria-label="Loading" />
  }
  return children
}
