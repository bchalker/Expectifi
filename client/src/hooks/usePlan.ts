import { useAuth } from '../context/AuthContext'

/** Paid access: active or trialing Stripe subscription. Guests are not gated here. */
export function usePlan() {
  const { user } = useAuth()
  const status = user?.subscriptionStatus ?? 'none'
  const hasPaidSubscription = status === 'active' || status === 'trialing'

  return {
    status,
    hasPaidSubscription,
    /** Signed-in user without an active subscription (renewal failed or never subscribed). */
    needsSubscription: Boolean(user) && !hasPaidSubscription,
  }
}
