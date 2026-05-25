/**
 * Create expectifi2026 in Stripe TEST mode (local dev uses sk_test_).
 * Run: npm run seed:test-promo -w server
 */
import { config } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'

const root = dirname(fileURLToPath(import.meta.url))
config({ path: join(root, '..', '.env') })

const CODE = 'expectifi2026'
const key = process.env.STRIPE_SECRET_KEY?.trim()
if (!key?.startsWith('sk_test_')) {
  console.error('STRIPE_SECRET_KEY must be sk_test_… — refuse to seed live mode.')
  process.exit(1)
}

const stripe = new Stripe(key)

const existing = await stripe.promotionCodes.list({ code: CODE, limit: 1 })
if (existing.data[0]?.active) {
  console.log(`Promotion code already exists: ${existing.data[0].id} (${CODE})`)
  process.exit(0)
}

const coupon = await stripe.coupons.create({
  percent_off: 100,
  duration: 'forever',
  name: 'Expectifi friends (test)',
})

const promo = await stripe.promotionCodes.create({
  promotion: { type: 'coupon', coupon: coupon.id },
  code: CODE,
})

console.log(`Created coupon ${coupon.id}`)
console.log(`Created promotion code ${promo.id} → "${promo.code}" (active: ${promo.active})`)
