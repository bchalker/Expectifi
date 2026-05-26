import type { ReactNode } from 'react'
import { UserTierProvider } from '../context/UserTierContext'
import { TierHydrationGate } from './TierHydrationGate'

export function CalculatorShell({ children }: { children: ReactNode }) {
  return (
    <UserTierProvider>
      <TierHydrationGate>{children}</TierHydrationGate>
    </UserTierProvider>
  )
}
