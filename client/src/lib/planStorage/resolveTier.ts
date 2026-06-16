import { hasSavePlanBeenAccepted, loadMeta } from './meta'
import type { AuthTierInput, UserTier } from './types'

export type { AuthTierInput, UserTier }

export function isPaidSubscription(
  status: NonNullable<AuthTierInput>['subscriptionStatus'],
): boolean {
  return status === 'active' || status === 'trialing'
}

export function resolveUserTier(auth: AuthTierInput): UserTier {
  if (auth?.subscriptionStatus != null) {
    if (isPaidSubscription(auth.subscriptionStatus)) return 'pro'
    return 'authenticated_free'
  }
  const meta = loadMeta()
  if (meta?.tier === 'browser_saved' && hasSavePlanBeenAccepted()) return 'browser_saved'
  return 'anonymous'
}

/** Full plan blobs (session, accounts, prefs) — authenticated users only. Guests: profile key only. */
export function canPersistPlanToLocalStorage(tier: UserTier): boolean {
  return tierIsAuthenticated(tier)
}

export function tierIsAuthenticated(tier: UserTier): boolean {
  return tier === 'authenticated_free' || tier === 'pro'
}

/** CSV / Plaid holdings blobs persist locally for paid (pro) subscribers only. */
export function tierCanPersistCsvHoldings(tier: UserTier): boolean {
  return tier === 'pro'
}
