import Stripe from 'stripe'

let stripe: Stripe | null = null

export class StripeBillingError extends Error {
  readonly code: string

  constructor(code: string, message?: string) {
    super(message ?? code)
    this.name = 'StripeBillingError'
    this.code = code
  }
}

export function isStripeBillingError(e: unknown): e is StripeBillingError {
  return e instanceof StripeBillingError
}

export function getStripeBackend(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  if (!stripe) {
    stripe = new Stripe(key)
  }
  return stripe
}

/** `live` | `test` from STRIPE_SECRET_KEY prefix; null when unset. */
export function getStripeKeyMode(): 'live' | 'test' | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  if (key.startsWith('sk_live_')) return 'live'
  if (key.startsWith('sk_test_')) return 'test'
  return null
}

/** Recurring price for signup (e.g. $9/mo). Create in Stripe Dashboard → Products → copy price_… id. */
export function getStripeSubscriptionPriceId(): string | null {
  const id =
    process.env.STRIPE_SUBSCRIPTION_PRICE_ID?.trim() ||
    process.env.STRIPE_PRICE_ID?.trim()
  return id || null
}

function normalizeStripeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * One Stripe customer per email: reuse an existing record when present (avoids duplicate
 * dashboard rows from retries or re-registration after a deleted app user).
 */
export async function resolveStripeCustomerForEmail(
  stripe: Stripe,
  email: string,
  appUserId: string,
): Promise<Stripe.Customer> {
  const normalized = normalizeStripeEmail(email)
  const listed = await stripe.customers.list({ email: normalized, limit: 100 })

  const forUser = listed.data.find((c) => c.metadata?.app_user_id === appUserId)
  if (forUser) return forUser

  if (listed.data.length > 0) {
    const canonical = [...listed.data].sort((a, b) => (a.created ?? 0) - (b.created ?? 0))[0]
    await stripe.customers.update(canonical.id, {
      metadata: { ...canonical.metadata, app_user_id: appUserId },
    })
    return canonical
  }

  return stripe.customers.create({
    email: normalized,
    metadata: { app_user_id: appUserId },
  })
}

export async function attachPaymentMethodToCustomer(
  stripe: Stripe,
  customerId: string,
  paymentMethodId: string,
): Promise<void> {
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
  if (pm.customer && pm.customer !== customerId) {
    await stripe.paymentMethods.detach(paymentMethodId)
  }
  if (pm.customer !== customerId) {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })
  }
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })
}

/**
 * Ensures at most one active subscription on this customer for the configured price.
 * Creates the first invoice/charge when STRIPE_SUBSCRIPTION_PRICE_ID is set.
 */
async function assertRecurringPrice(stripe: Stripe, priceId: string): Promise<void> {
  const price = await stripe.prices.retrieve(priceId)
  if (!price.active) {
    throw new StripeBillingError('subscription_price_inactive', `Price ${priceId} is not active`)
  }
  if (price.type !== 'recurring' || !price.recurring) {
    throw new StripeBillingError(
      'subscription_price_not_recurring',
      `Price ${priceId} must be a recurring price`,
    )
  }
}

function isBillableSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
  return status === 'active' || status === 'trialing'
}

/**
 * Creates or reuses an active/trialing subscription for the configured price.
 * Throws when STRIPE_SUBSCRIPTION_PRICE_ID is missing or subscription cannot be activated.
 */
export async function ensureStripeSubscription(
  stripe: Stripe,
  customerId: string,
  paymentMethodId: string,
  appUserId?: string,
): Promise<string> {
  const priceId = getStripeSubscriptionPriceId()
  if (!priceId) {
    throw new StripeBillingError(
      'subscription_price_not_configured',
      'Set STRIPE_SUBSCRIPTION_PRICE_ID in server/.env to a recurring price_… id',
    )
  }

  await assertRecurringPrice(stripe, priceId)

  const existing = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 20,
  })

  const matching = existing.data.find(
    (s) =>
      isBillableSubscriptionStatus(s.status) &&
      s.items.data.some((item) => item.price?.id === priceId),
  )

  if (matching) {
    await stripe.subscriptions.update(matching.id, {
      default_payment_method: paymentMethodId,
    })
    for (const s of existing.data) {
      if (s.id !== matching.id && isBillableSubscriptionStatus(s.status)) {
        await stripe.subscriptions.cancel(s.id)
      }
    }
    return matching.id
  }

  for (const s of existing.data) {
    if (isBillableSubscriptionStatus(s.status)) {
      await stripe.subscriptions.cancel(s.id)
    }
  }

  const sub = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: paymentMethodId,
    payment_behavior: 'error_if_incomplete',
    collection_method: 'charge_automatically',
    payment_settings: {
      payment_method_types: ['card'],
      save_default_payment_method: 'on_subscription',
    },
    metadata: appUserId ? { app_user_id: appUserId } : undefined,
    expand: ['latest_invoice'],
  })

  if (!isBillableSubscriptionStatus(sub.status)) {
    throw new StripeBillingError(
      'subscription_not_active',
      `Subscription ${sub.id} was created with status ${sub.status}`,
    )
  }

  return sub.id
}

/** For accounts that have a Stripe customer + card but no subscription (legacy signups). */
export async function repairStripeSubscriptionForCustomer(
  stripe: Stripe,
  customerId: string,
): Promise<string> {
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    throw new StripeBillingError('stripe_customer_deleted')
  }
  const defaultPm =
    typeof customer.invoice_settings?.default_payment_method === 'string'
      ? customer.invoice_settings.default_payment_method
      : customer.invoice_settings?.default_payment_method?.id
  if (defaultPm) {
    return ensureStripeSubscription(stripe, customerId, defaultPm)
  }
  const listed = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 })
  const pm = listed.data[0]
  if (!pm) {
    throw new StripeBillingError('no_payment_method_on_customer')
  }
  await attachPaymentMethodToCustomer(stripe, customerId, pm.id)
  return ensureStripeSubscription(stripe, customerId, pm.id)
}

/** Cancel every non-terminal subscription for a Stripe customer (account closure). */
export async function cancelAllStripeSubscriptionsForCustomer(
  stripe: Stripe,
  customerId: string,
): Promise<number> {
  const listed = await stripe.subscriptions.list({ customer: customerId, limit: 100 })
  let cancelled = 0
  for (const sub of listed.data) {
    if (sub.status === 'canceled' || sub.status === 'incomplete_expired') continue
    await stripe.subscriptions.cancel(sub.id)
    cancelled += 1
  }
  return cancelled
}

/** Attach card + optional subscription after signup or Google checkout. */
export async function completeStripeBillingSetup(
  stripe: Stripe,
  email: string,
  appUserId: string,
  paymentMethodId: string,
): Promise<{ customerId: string; subscriptionId: string }> {
  const customer = await resolveStripeCustomerForEmail(stripe, email, appUserId)
  await attachPaymentMethodToCustomer(stripe, customer.id, paymentMethodId)
  const subscriptionId = await ensureStripeSubscription(
    stripe,
    customer.id,
    paymentMethodId,
    appUserId,
  )
  return { customerId: customer.id, subscriptionId }
}

export function assertSubscriptionBillingConfigured(): void {
  const stripe = getStripeBackend()
  if (!stripe) return
  if (!getStripeSubscriptionPriceId()) {
    throw new StripeBillingError(
      'subscription_price_not_configured',
      'Set STRIPE_SUBSCRIPTION_PRICE_ID in server/.env to your $9/mo recurring price_… id',
    )
  }
}
