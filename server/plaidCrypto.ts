import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16
const KEY_BYTES = 32

function encryptionKey(): Buffer {
  const secret = process.env.PLAID_TOKEN_ENCRYPTION_KEY?.trim() || process.env.JWT_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error('PLAID_TOKEN_ENCRYPTION_KEY or JWT_SECRET (32+ chars) required for Plaid token encryption')
  }
  return scryptSync(secret, 'headwayplanner-plaid-v1', KEY_BYTES)
}

export function encryptPlaidAccessToken(plain: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, encryptionKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64url')
}

export function decryptPlaidAccessToken(stored: string): string {
  const buf = Buffer.from(stored, 'base64url')
  if (buf.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error('invalid_encrypted_plaid_token')
  }
  const iv = buf.subarray(0, IV_BYTES)
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const data = buf.subarray(IV_BYTES + TAG_BYTES)
  const decipher = createDecipheriv(ALGO, encryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
