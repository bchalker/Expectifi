import type Stripe from 'stripe'
import { dbQuery } from './dbQuery.js'

/** Mirrors Stripe subscription.status values we persist on users. */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | 'none'

export function subscriptionStatusFromStripe(
  status: Stripe.Subscription.Status | string | null | undefined,
): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return status
    default:
      return 'none'
  }
}

export function subscriptionGrantsAccess(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'active' || status === 'trialing'
}

export async function findUserIdByStripeCustomerId(customerId: string): Promise<string | null> {
  const { rows } = await dbQuery<{ id: string }>(
    'SELECT id FROM users WHERE stripe_customer_id = ? LIMIT 1',
    [customerId],
  )
  return rows[0]?.id ?? null
}

export async function findUserIdForStripeSubscription(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const fromCustomer =
    typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  if (fromCustomer) {
    const byCustomer = await findUserIdByStripeCustomerId(fromCustomer)
    if (byCustomer) return byCustomer
  }
  const appUserId = sub.metadata?.app_user_id?.trim()
  if (appUserId) return appUserId
  return null
}

export async function setUserSubscriptionBilling(
  userId: string,
  patch: {
    stripeSubscriptionId?: string | null
    subscriptionStatus: SubscriptionStatus
  },
): Promise<void> {
  if (patch.stripeSubscriptionId !== undefined) {
    await dbQuery(
      'UPDATE users SET stripe_subscription_id = ?, subscription_status = ? WHERE id = ?',
      [patch.stripeSubscriptionId, patch.subscriptionStatus, userId],
    )
    return
  }
  await dbQuery('UPDATE users SET subscription_status = ? WHERE id = ?', [
    patch.subscriptionStatus,
    userId,
  ])
}

export async function syncUserFromStripeSubscription(
  userId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  await dbQuery(
    'UPDATE users SET stripe_subscription_id = ?, subscription_status = ? WHERE id = ?',
    [sub.id, subscriptionStatusFromStripe(sub.status), userId],
  )
}
