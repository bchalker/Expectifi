export type AppliedSignupPromo = {
  code: string
  promotionCodeId: string
  waivesPayment: boolean
  discount: string
  message: string
}

export type ValidatePromoResponse =
  | {
      ok: true
      valid?: true
      code: string
      promotionCodeId: string
      promotion_code_id?: string
      waivesPayment: boolean
      discount: string
      message: string
    }
  | { ok: false; error: string; hint?: string; stripeMode?: string }

export async function validateSignupPromoCode(
  promoCode: string,
): Promise<ValidatePromoResponse> {
  const res = await fetch('/api/stripe/validate-promo', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promoCode, code: promoCode }),
  })
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return { ok: false, error: 'promo_validation_failed' }
  }
  const data = (await res.json()) as ValidatePromoResponse
  if (!res.ok && !('ok' in data && data.ok)) {
    return { ok: false, error: 'error' in data ? data.error : 'promo_validation_failed' }
  }
  return data
}

export function appliedPromoFromValidation(
  promo: Extract<ValidatePromoResponse, { ok: true }>,
): AppliedSignupPromo {
  const promotionCodeId = promo.promotionCodeId ?? promo.promotion_code_id ?? ''
  return {
    code: promo.code,
    promotionCodeId,
    waivesPayment: promo.waivesPayment,
    discount: promo.discount,
    message: promo.message,
  }
}

export function promoValidationErrorMessage(
  error: string | undefined,
  hint?: string,
): string {
  if (hint?.trim()) return hint.trim()
  switch (error) {
    case 'promo_validation_failed':
      return 'Could not validate the promo code. Redeploy the app or try again in a moment.'
    case 'stripe_not_configured':
      return 'Payment is not configured on the server.'
    case 'invalid_promo_code':
    default:
      return 'That promo code is not valid or has expired.'
  }
}
