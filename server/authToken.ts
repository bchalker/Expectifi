import * as jose from 'jose'

export const COOKIE_NAME = 'rc_session'

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
