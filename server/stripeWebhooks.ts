import type { Express, Request, Response } from 'express'
import express from 'express'
import type Stripe from 'stripe'
import {
  findUserIdByStripeCustomerId,
  findUserIdForStripeSubscription,
  setUserSubscriptionBilling,
  subscriptionStatusFromStripe,
  syncUserFromStripeSubscription,
} from './stripeBilling.js'
import { getStripeBackend, getStripeKeyMode, getStripeSubscriptionPriceId } from './stripeBackend.js'

async function handleSubscriptionEvent(sub: Stripe.Subscription): Promise<void> {
  const userId = await findUserIdForStripeSubscription(sub)
  if (!userId) return
  await syncUserFromStripeSubscription(userId, sub)
}

async function handleInvoiceEvent(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  const userId = await findUserIdByStripeCustomerId(customerId)
  if (!userId) return

  const subId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id

  if (invoice.status === 'paid') {
    await setUserSubscriptionBilling(userId, {
      stripeSubscriptionId: subId ?? undefined,
      subscriptionStatus: 'active',
    })
    return
  }

  if (invoice.status === 'open' && invoice.attempt_count > 0) {
    await setUserSubscriptionBilling(userId, {
      stripeSubscriptionId: subId ?? undefined,
      subscriptionStatus: 'past_due',
    })
  }
}

async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription)
      break
    case 'invoice.paid':
    case 'invoice.payment_failed':
      await handleInvoiceEvent(event.data.object as Stripe.Invoice)
      break
    default:
      break
  }
}

/** Register before `express.json()` so the body stays raw for signature verification. */
export function installStripeWebhook(app: Express): void {
  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      const stripe = getStripeBackend()
      const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
      if (!stripe || !secret) {
        res.status(503).json({ ok: false, error: 'stripe_webhook_not_configured' })
        return
      }

      const sig = req.headers['stripe-signature']
      if (!sig || typeof sig !== 'string') {
        res.status(400).json({ ok: false, error: 'missing_signature' })
        return
      }

      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, secret)
      } catch {
        res.status(400).json({ ok: false, error: 'invalid_signature' })
        return
      }

      try {
        await dispatchStripeEvent(event)
        res.json({ received: true })
      } catch {
        res.status(500).json({ ok: false, error: 'handler_failed' })
      }
    },
  )
}

export function logStripeBillingConfigAtStartup(): void {
  const stripe = getStripeBackend()
  const priceId = getStripeSubscriptionPriceId()
  const mode = getStripeKeyMode()
  if (!stripe) return
  console.info(`[stripe] Billing enabled (${mode ?? 'unknown'} mode)`)
  if (!priceId) {
    console.warn(
      '[stripe] STRIPE_SECRET_KEY is set but STRIPE_SUBSCRIPTION_PRICE_ID is missing — signups will not create $9/mo subscriptions',
    )
    return
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    console.warn(
      '[stripe] STRIPE_WEBHOOK_SECRET is not set — renewals and failed payments will not sync to the app',
    )
  }
}
