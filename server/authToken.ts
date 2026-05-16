import * as jose from 'jose'

export const COOKIE_NAME = 'rc_session'

/** Short-lived cookie: user signed in with Google but must finish Stripe before `rc_session` is issued. */
export const GOOGLE_CHECKOUT_COOKIE = 'rc_google_checkout'

const GOOGLE_CHECKOUT_PURPOSE = 'google_stripe_checkout'

function getJwtSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters')
  }
  return new TextEncoder().encode(s)
}

export async function createToken(userId: string, email: string): Promise<string> {
  return new jose.SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret())
}

export async function verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getJwtSecret())
    const sub = payload.sub
    const email = payload.email
    if (typeof sub !== 'string' || typeof email !== 'string') return null
    return { userId: sub, email }
  } catch {
    return null
  }
}

export async function createGoogleCheckoutToken(userId: string, email: string): Promise<string> {
  return new jose.SignJWT({ email, purpose: GOOGLE_CHECKOUT_PURPOSE })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(getJwtSecret())
}

export async function verifyGoogleCheckoutToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getJwtSecret())
    if (payload.purpose !== GOOGLE_CHECKOUT_PURPOSE) return null
    const sub = payload.sub
    const email = payload.email
    if (typeof sub !== 'string' || typeof email !== 'string') return null
    return { userId: sub, email }
  } catch {
    return null
  }
}
