import Stripe from 'stripe'

let stripe: Stripe | null = null

export function getStripeBackend(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  if (!stripe) {
    stripe = new Stripe(key)
  }
  return stripe
}
