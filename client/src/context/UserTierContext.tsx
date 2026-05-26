import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth, type AuthUser } from './AuthContext'
import {
  bootPlanHydration,
  canPersistPlanToLocalStorage,
  createDefaultPlanHydration,
  loadMeta,
  setPlanWriteTier,
  type AuthTierInput,
  type PlanHydration,
  type UserTier,
} from '../lib/planStorage'

export type UserTierContextValue = {
  tier: UserTier
  isHydrated: boolean
  isPro: boolean
  canPersistPlanLocally: boolean
  canUsePlaid: boolean
  canPersistCsvHoldings: boolean
  hydration: PlanHydration
}

export const UserTierContext = createContext<UserTierContextValue | null>(null)

function authTierInputFromUser(user: AuthUser | null): AuthTierInput {
  if (!user) return null
  return { subscriptionStatus: user.subscriptionStatus ?? 'none' }
}

export function UserTierProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading, user } = useAuth()
  const [hydration, setHydration] = useState<PlanHydration>(createDefaultPlanHydration)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setIsHydrated(false)

    loadMeta()
    const auth = authTierInputFromUser(user)
    const nextHydration = bootPlanHydration(auth)
    if (cancelled) return

    setPlanWriteTier(nextHydration.tier)
    setHydration(nextHydration)
    setIsHydrated(true)

    return () => {
      cancelled = true
    }
  }, [authLoading, user?.id, user?.subscriptionStatus])

  const tier = hydration.tier

  const value = useMemo((): UserTierContextValue => {
    const isPro = tier === 'pro'
    return {
      tier,
      isHydrated,
      isPro,
      canPersistPlanLocally: canPersistPlanToLocalStorage(tier),
      canUsePlaid: isPro,
      canPersistCsvHoldings: isPro,
      hydration,
    }
  }, [tier, isHydrated, hydration])

  return (
    <UserTierContext.Provider value={value}>{children}</UserTierContext.Provider>
  )
}
