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
  profileHasOnboardingComplete,
  loadPlanProfile,
  savePlanProfile,
  bootPlanHydration,
  canPersistPlanToLocalStorage,
  createDefaultPlanHydration,
  purgeUnconsentedPlanStorage,
  resolveUserTier,
  setPlanWriteTier,
  type AuthTierInput,
  type PlanHydration,
  type PlanPersistSnapshot,
  type UserTier,
} from '../lib/planStorage'
import {
  clearSessionOnboardingAccounts,
  clearSessionOnboardingComplete,
  CSV_SESSION_HOLDINGS_EVENT,
  hasSessionCsvHoldings,
  isSessionOnboardingComplete,
  isSessionSavePlanDismissed,
  ONBOARDING_SESSION_COMPLETE_EVENT,
  setSessionSavePlanDismissed,
} from '../lib/sessionFlags'
import { clearCsvSession } from '../lib/planStorage/csvSession'
import { hydrateCsvImportFromServer } from '../lib/csvImportServerSync'
import { hydratePlanStateFromServer } from '../lib/planStateServerSync'

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
  hasSessionCsvHoldings: boolean
  clearCsvSession: () => void
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
  const [csvHoldingsRev, setCsvHoldingsRev] = useState(0)
  const browserSaveSnapshotRef = useRef<(() => PlanPersistSnapshot) | null>(null)

  useEffect(() => {
    const onOnboardingSessionComplete = () => {
      setSavePlanSuppressed(false)
      setSavePlanPromptRev((n) => n + 1)
      setHydration((current) => ({
        ...current,
        onboardingComplete: true,
      }))
    }
    window.addEventListener(ONBOARDING_SESSION_COMPLETE_EVENT, onOnboardingSessionComplete)
    return () => {
      window.removeEventListener(ONBOARDING_SESSION_COMPLETE_EVENT, onOnboardingSessionComplete)
    }
  }, [])

  useEffect(() => {
    const onCsvHoldingsChange = () => setCsvHoldingsRev((n) => n + 1)
    window.addEventListener(CSV_SESSION_HOLDINGS_EVENT, onCsvHoldingsChange)
    return () => {
      window.removeEventListener(CSV_SESSION_HOLDINGS_EVENT, onCsvHoldingsChange)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setIsHydrated(false)

    const run = async () => {
      const auth = authTierInputFromUser(user)
      if (user) {
        bootPlanHydration(auth)
        setPlanWriteTier(resolveUserTier(auth))
        await hydratePlanStateFromServer()
        if (cancelled) return
      }
      const nextHydration = bootPlanHydration(auth)
      if (cancelled) return
      setPlanWriteTier(nextHydration.tier)
      setHydration(nextHydration)
      setIsHydrated(true)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [authLoading, user?.id, user?.subscriptionStatus])

  const tier = hydration.tier

  useEffect(() => {
    if (!isHydrated || authLoading || tier !== 'pro' || !user) return
    void hydrateCsvImportFromServer().then((applied) => {
      if (applied) setCsvHoldingsRev((n) => n + 1)
    })
  }, [isHydrated, authLoading, tier, user?.id])

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
    if (!snapshot?.profile) return

    savePlanProfile({ ...snapshot.profile, onboardingComplete: true, version: 1 })
    setHydration((current) => ({
      ...current,
      profile: { ...snapshot.profile, onboardingComplete: true, version: 1 },
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
    if (profileHasOnboardingComplete(loadPlanProfile())) return false
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

  const sessionCsvHoldings = useMemo(() => {
    void csvHoldingsRev
    return hasSessionCsvHoldings()
  }, [csvHoldingsRev])

  const clearCsvSessionInContext = useCallback(() => {
    clearCsvSession()
  }, [])

  const value = useMemo((): UserTierContextValue => {
    const isPro = tier === 'pro'
    return {
      tier,
      isHydrated,
      isPro,
      canPersistPlanLocally: canPersistPlanToLocalStorage(tier),
      canUsePlaid: isPro,
      canPersistCsvHoldings: isPro,
      hasSessionCsvHoldings: sessionCsvHoldings,
      clearCsvSession: clearCsvSessionInContext,
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
    sessionCsvHoldings,
    clearCsvSessionInContext,
  ])

  return (
    <UserTierContext.Provider value={value}>{children}</UserTierContext.Provider>
  )
}
