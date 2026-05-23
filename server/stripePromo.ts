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

export async function resolveSignupPromotionCode(
  stripe: Stripe,
  rawCode: string,
): Promise<{ promotionCodeId: string; waivesPayment: boolean; code: string } | null> {
  const code = normalizePromoCodeInput(rawCode)
  if (!code) return null
  const listed = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
    expand: ['data.coupon'],
  })
  const pc = listed.data[0]
  if (!pc?.id || !pc.active) return null
  const waivesPayment = await promotionCodeWaivesPaymentMethod(stripe, pc)
  return { promotionCodeId: pc.id, waivesPayment, code }
}
