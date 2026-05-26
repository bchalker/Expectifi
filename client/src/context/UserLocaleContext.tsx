import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { taxConfigForLocale, type TaxConfig } from '../config/taxConfig'
import {
  findOnboardingRegion,
  normalizeOnboardingRegionId,
  ONBOARDING_REGION_OPTIONS,
  type OnboardingRegionId,
} from '../lib/onboardingRegions'
import {
  loadUserProfile,
  USER_PROFILE_STORAGE_KEY,
  USER_PROFILE_UPDATED_EVENT,
  type StoredUserProfile,
} from '../lib/userProfileStorage'
import {
  residenceCountryToDisplayCurrency,
  setDisplayCurrencyCode,
  type DisplayCurrencyCode,
} from '../lib/displayCurrency'

function localeFromResidenceCountry(country: string | undefined): OnboardingRegionId | null {
  const trimmed = country?.trim()
  if (!trimmed) return null
  const match = ONBOARDING_REGION_OPTIONS.find((r) => r.country === trimmed)
  return match?.locale ?? null
}

function resolveLocaleFromProfile(
  profile: StoredUserProfile | null,
  residenceCountry?: string,
): OnboardingRegionId {
  const fromProfile = normalizeOnboardingRegionId(profile?.locale)
  if (fromProfile) return fromProfile
  const fromResidence = localeFromResidenceCountry(residenceCountry) ?? localeFromResidenceCountry(profile?.country)
  if (fromResidence) return fromResidence
  return 'us'
}

function syncCurrencyForLocale(locale: OnboardingRegionId, residenceCountry?: string): void {
  const region = findOnboardingRegion(locale)
  const code: DisplayCurrencyCode =
    region?.currency ?? residenceCountryToDisplayCurrency(residenceCountry ?? region?.country ?? '')
  setDisplayCurrencyCode(code)
}

type UserLocaleContextValue = {
  locale: OnboardingRegionId
  taxConfig: TaxConfig
  refreshLocale: () => void
}

const UserLocaleContext = createContext<UserLocaleContextValue | null>(null)

export function UserLocaleProvider({
  children,
  residenceCountry,
}: {
  children: ReactNode
  residenceCountry?: string
}) {
  const [profileRevision, setProfileRevision] = useState(0)

  const refreshLocale = useCallback(() => {
    setProfileRevision((n) => n + 1)
  }, [])

  useEffect(() => {
    const onProfileUpdated = () => refreshLocale()
    const onStorage = (e: StorageEvent) => {
      if (e.key === USER_PROFILE_STORAGE_KEY || e.key === 'hwp_user_profile') refreshLocale()
    }
    window.addEventListener(USER_PROFILE_UPDATED_EVENT, onProfileUpdated)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(USER_PROFILE_UPDATED_EVENT, onProfileUpdated)
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshLocale])

  const value = useMemo((): UserLocaleContextValue => {
    void profileRevision
    const profile = loadUserProfile()
    const locale = resolveLocaleFromProfile(profile, residenceCountry)
    syncCurrencyForLocale(locale, residenceCountry ?? profile?.country)
    return {
      locale,
      taxConfig: taxConfigForLocale(locale),
      refreshLocale,
    }
  }, [profileRevision, residenceCountry])

  return <UserLocaleContext.Provider value={value}>{children}</UserLocaleContext.Provider>
}

export function useUserLocale(): UserLocaleContextValue {
  const ctx = useContext(UserLocaleContext)
  if (!ctx) {
    const profile = loadUserProfile()
    const locale = resolveLocaleFromProfile(profile)
    syncCurrencyForLocale(locale, profile?.country)
    return {
      locale,
      taxConfig: taxConfigForLocale(locale),
      refreshLocale: () => {},
    }
  }
  return ctx
}
