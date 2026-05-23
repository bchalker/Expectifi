export type ValidatePromoResponse =
  | {
      ok: true
      code: string
      waivesPayment: boolean
      message: string
    }
  | { ok: false; error: string }

export async function validateSignupPromoCode(
  promoCode: string,
): Promise<ValidatePromoResponse> {
  const res = await fetch('/api/stripe/validate-promo', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promoCode }),
  })
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return { ok: false, error: 'promo_validation_failed' }
  }
  const data = (await res.json()) as ValidatePromoResponse
  if (!res.ok && !('ok' in data)) {
    return { ok: false, error: 'promo_validation_failed' }
  }
  return data
}

export function promoValidationErrorMessage(error: string | undefined): string {
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
