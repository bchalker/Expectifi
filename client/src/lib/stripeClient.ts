import { loadStripe, type Stripe } from '@stripe/stripe-js'

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

export const stripePublishableKeyConfigured =
  typeof key === 'string' && key.length > 0 && key !== 'undefined'

let stripePromise: Promise<Stripe | null> | null = null

/** Null if publishable key is not configured. */
export function getStripeBrowserPromise(): Promise<Stripe | null> | null {
  if (!stripePublishableKeyConfigured) return null
  if (!stripePromise) {
    stripePromise = loadStripe(key as string)
  }
  return stripePromise
}
