import type Stripe from 'stripe'

export function normalizePromoCodeInput(raw: string): string {
  return raw.trim()
}

function couponFromPromotionCode(pc: Stripe.PromotionCode): Stripe.Coupon | null {
  const c = pc.coupon
  if (!c || typeof c === 'string') return null
  if ('deleted' in c && c.deleted) return null
  return c
}

/** 100% off forever/repeating — no card required at signup. */
export function couponWaivesPaymentMethod(coupon: Stripe.Coupon): boolean {
  return (
    coupon.percent_off === 100 &&
    (coupon.duration === 'forever' || coupon.duration === 'repeating')
  )
}

export function formatPromoDiscountLabel(coupon: Stripe.Coupon): string {
  if (coupon.percent_off != null) {
    return `${coupon.percent_off}% off`
  }
  if (coupon.amount_off != null && coupon.currency) {
    const major = coupon.amount_off / 100
    const currency = coupon.currency.toUpperCase()
    return `${currency} ${major} off`
  }
  return 'Discount applied'
}

export async function promotionCodeWaivesPaymentMethod(
  stripe: Stripe,
  promotionCode: Stripe.PromotionCode,
): Promise<boolean> {
  let coupon = couponFromPromotionCode(promotionCode)
  if (!coupon) {
    const couponId =
      typeof promotionCode.coupon === 'string' ? promotionCode.coupon : null
    if (!couponId) return false
    coupon = await stripe.coupons.retrieve(couponId)
  }
  return couponWaivesPaymentMethod(coupon)
}

async function couponForPromotionCode(
  stripe: Stripe,
  promotionCode: Stripe.PromotionCode,
): Promise<Stripe.Coupon | null> {
  let coupon = couponFromPromotionCode(promotionCode)
  if (!coupon) {
    const couponId =
      typeof promotionCode.coupon === 'string' ? promotionCode.coupon : null
    if (!couponId) return null
    coupon = await stripe.coupons.retrieve(couponId)
  }
  return coupon
}

export type ResolvedSignupPromo = {
  promotionCodeId: string
  waivesPayment: boolean
  code: string
  discount: string
}

async function resolvePromotionCodeRecord(
  stripe: Stripe,
  pc: Stripe.PromotionCode,
): Promise<ResolvedSignupPromo | null> {
  if (!pc.id || !pc.active) return null
  const coupon = await couponForPromotionCode(stripe, pc)
  if (!coupon) return null
  const waivesPayment = couponWaivesPaymentMethod(coupon)
  return {
    promotionCodeId: pc.id,
    waivesPayment,
    code: pc.code ?? '',
    discount: formatPromoDiscountLabel(coupon),
  }
}

/** Lookup by customer-facing code (exact, then case-insensitive) or promo_… id. */
export async function resolveSignupPromotionCode(
  stripe: Stripe,
  rawCode: string,
): Promise<ResolvedSignupPromo | null> {
  const code = normalizePromoCodeInput(rawCode)
  if (!code) return null

  if (code.startsWith('promo_')) {
    return resolveSignupPromotionById(stripe, code)
  }

  const listed = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
    expand: ['data.coupon'],
  })
  const exact = listed.data[0]
  if (exact?.id && exact.active) {
    const resolved = await resolvePromotionCodeRecord(stripe, exact)
    if (resolved) return resolved
  }

  const target = code.toLowerCase()
  let startingAfter: string | undefined
  for (let page = 0; page < 10; page++) {
    const batch = await stripe.promotionCodes.list({
      active: true,
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.coupon'],
    })
    const match = batch.data.find(
      (pc) => pc.code?.toLowerCase() === target && pc.active,
    )
    if (match) {
      const resolved = await resolvePromotionCodeRecord(stripe, match)
      if (resolved) return resolved
    }
    if (!batch.has_more || batch.data.length === 0) break
    startingAfter = batch.data[batch.data.length - 1]?.id
  }

  return null
}

export async function resolveSignupPromotionById(
  stripe: Stripe,
  promotionCodeId: string,
): Promise<ResolvedSignupPromo | null> {
  const id = promotionCodeId.trim()
  if (!id.startsWith('promo_')) return null
  try {
    const pc = await stripe.promotionCodes.retrieve(id, { expand: ['coupon'] })
    if (!pc.active) return null
    return resolvePromotionCodeRecord(stripe, pc)
  } catch {
    return null
  }
}
