import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth, type AuthUser } from './AuthContext'
import {
  bootPlanHydration,
  canPersistPlanToLocalStorage,
  createDefaultPlanHydration,
  defaultMeta,
  hasSavePlanBeenAccepted,
  persistPlanState,
  purgeUnconsentedPlanStorage,
  saveMeta,
  setPlanWriteTier,
  type AuthTierInput,
  type PlanHydration,
  type PlanPersistSnapshot,
  type UserTier,
} from '../lib/planStorage'
import {
  clearSessionOnboardingAccounts,
  clearSessionOnboardingComplete,
  isSessionOnboardingComplete,
  isSessionSavePlanDismissed,
  ONBOARDING_SESSION_COMPLETE_EVENT,
  setSessionSavePlanDismissed,
} from '../lib/sessionFlags'

export type SavePlanPromptSignals = {
  dashboardVisible: boolean
  projectedIncomeMonthly: number
}

export type UserTierContextValue = {
  tier: UserTier
  isHydrated: boolean
  isPro: boolean
  canPersistPlanLocally: boolean
  canUsePlaid: boolean
  canPersistCsvHoldings: boolean
  hydration: PlanHydration
  showSavePlanPrompt: boolean
  acceptBrowserSave: () => void
  dismissSavePlanPrompt: () => void
  updateSavePlanPromptSignals: (signals: SavePlanPromptSignals) => void
  registerBrowserSaveSnapshot: (getter: () => PlanPersistSnapshot) => void
}

export const UserTierContext = createContext<UserTierContextValue | null>(null)

const defaultSavePlanSignals: SavePlanPromptSignals = {
  dashboardVisible: false,
  projectedIncomeMonthly: 0,
}

function authTierInputFromUser(user: AuthUser | null): AuthTierInput {
  if (!user) return null
  return { subscriptionStatus: user.subscriptionStatus ?? 'none' }
}

export function UserTierProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading, user } = useAuth()
  const [hydration, setHydration] = useState<PlanHydration>(createDefaultPlanHydration)
  const [isHydrated, setIsHydrated] = useState(false)
  const [savePlanSignals, setSavePlanSignals] = useState<SavePlanPromptSignals>(defaultSavePlanSignals)
  const [savePlanSuppressed, setSavePlanSuppressed] = useState(false)
  const [savePlanPromptRev, setSavePlanPromptRev] = useState(0)
  const browserSaveSnapshotRef = useRef<(() => PlanPersistSnapshot) | null>(null)

  useEffect(() => {
    const onOnboardingSessionComplete = () => {
      setSavePlanSuppressed(false)
      setSavePlanPromptRev((n) => n + 1)
    }
    window.addEventListener(ONBOARDING_SESSION_COMPLETE_EVENT, onOnboardingSessionComplete)
    return () => {
      window.removeEventListener(ONBOARDING_SESSION_COMPLETE_EVENT, onOnboardingSessionComplete)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setIsHydrated(false)

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

  const updateSavePlanPromptSignals = useCallback((signals: SavePlanPromptSignals) => {
    setSavePlanSignals(signals)
  }, [])

  const registerBrowserSaveSnapshot = useCallback((getter: () => PlanPersistSnapshot) => {
    browserSaveSnapshotRef.current = getter
  }, [])

  const dismissSavePlanPrompt = useCallback(() => {
    setSessionSavePlanDismissed(true)
    clearSessionOnboardingComplete()
    purgeUnconsentedPlanStorage()
    setPlanWriteTier('anonymous')
    setHydration((current) => ({
      ...current,
      tier: 'anonymous',
      onboardingComplete: false,
    }))
    setSavePlanSuppressed(true)
    setSavePlanPromptRev((n) => n + 1)
  }, [])

  const acceptBrowserSave = useCallback(() => {
    const snapshot = browserSaveSnapshotRef.current?.()
    if (!snapshot) return

    const meta = defaultMeta('browser_saved')
    meta.prompts.savePlanAcceptedAt = new Date().toISOString()
    saveMeta(meta)
    setPlanWriteTier('browser_saved')

    persistPlanState('browser_saved', snapshot)
    setHydration((current) => ({
      ...current,
      tier: 'browser_saved',
      profile: snapshot.profile,
      accounts: snapshot.accounts,
      onboardingComplete: true,
    }))
    clearSessionOnboardingAccounts()
    setSavePlanSuppressed(true)
  }, [])

  const showSavePlanPrompt = useMemo(() => {
    void savePlanPromptRev
    if (!isHydrated || authLoading || savePlanSuppressed) return false
    if (user) return false
    if (tier !== 'anonymous') return false
    if (!isSessionOnboardingComplete()) return false
    if (!savePlanSignals.dashboardVisible) return false
    if (savePlanSignals.projectedIncomeMonthly <= 0) return false
    if (hasSavePlanBeenAccepted()) return false
    if (isSessionSavePlanDismissed()) return false
    return true
  }, [
    isHydrated,
    authLoading,
    savePlanSuppressed,
    savePlanPromptRev,
    user,
    tier,
    savePlanSignals.dashboardVisible,
    savePlanSignals.projectedIncomeMonthly,
  ])

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
      showSavePlanPrompt,
      acceptBrowserSave,
      dismissSavePlanPrompt,
      updateSavePlanPromptSignals,
      registerBrowserSaveSnapshot,
    }
  }, [
    tier,
    isHydrated,
    hydration,
    showSavePlanPrompt,
    acceptBrowserSave,
    dismissSavePlanPrompt,
    updateSavePlanPromptSignals,
    registerBrowserSaveSnapshot,
  ])

  return (
    <UserTierContext.Provider value={value}>{children}</UserTierContext.Provider>
  )
}
