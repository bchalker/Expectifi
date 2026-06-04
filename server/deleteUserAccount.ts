import { dbQuery } from './dbQuery.js'
import { decryptPlaidAccessToken } from './plaidCrypto.js'
import { getPlaidClient, isPlaidConfigured } from './plaidClient.js'
import {
  cancelAllStripeSubscriptionsForCustomer,
  deleteStripeCustomerRecord,
  getStripeBackend,
} from './stripeBackend.js'

type PlaidItemRow = {
  id: string
  access_token_enc: string
}

type UserBillingRow = {
  id: string
  email: string
  stripe_customer_id: string | null
}

/** Revoke Plaid links at the provider, then remove rows. */
async function revokeAllPlaidItemsForUser(userId: string): Promise<void> {
  const { rows } = await dbQuery<PlaidItemRow>(
    'SELECT id, access_token_enc FROM plaid_items WHERE user_id = ?',
    [userId],
  )
  if (rows.length === 0) return

  if (isPlaidConfigured()) {
    const plaid = getPlaidClient()
    for (const item of rows) {
      try {
        const accessToken = decryptPlaidAccessToken(item.access_token_enc)
        await plaid.itemRemove({ access_token: accessToken })
      } catch {
        /* still delete locally */
      }
    }
  }

  await dbQuery('DELETE FROM plaid_items WHERE user_id = ?', [userId])
}

export class AccountDeletionError extends Error {
  constructor(
    readonly code: 'stripe_cancel_failed' | 'delete_failed',
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'AccountDeletionError'
  }
}

/**
 * Permanently delete a user and all associated data (DB + third parties).
 * Used for self-service cancel account and admin scripts.
 */
export async function deleteUserAccountPermanently(userId: string): Promise<void> {
  const trimmedId = userId.trim()
  if (!trimmedId) throw new Error('invalid_user_id')

  const { rows } = await dbQuery<UserBillingRow>(
    'SELECT id, email, stripe_customer_id FROM users WHERE id = ? LIMIT 1',
    [trimmedId],
  )
  const user = rows[0]
  if (!user) return

  await revokeAllPlaidItemsForUser(trimmedId)
  await dbQuery('DELETE FROM accounts WHERE user_id = ?', [trimmedId])
  await dbQuery('DELETE FROM scenarios WHERE user_id = ?', [trimmedId])

  const stripeCustomerId = user.stripe_customer_id?.trim() || null
  const stripe = getStripeBackend()
  if (stripe && stripeCustomerId) {
    try {
      await cancelAllStripeSubscriptionsForCustomer(stripe, stripeCustomerId)
      await deleteStripeCustomerRecord(stripe, stripeCustomerId)
    } catch {
      throw new AccountDeletionError('stripe_cancel_failed')
    }
  }

  try {
    await dbQuery('DELETE FROM users WHERE id = ?', [trimmedId])
  } catch {
    throw new AccountDeletionError('delete_failed')
  }
}

export async function deleteUserAccountByEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false

  const { rows } = await dbQuery<{ id: string }>(
    'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
    [normalized],
  )
  const userId = rows[0]?.id
  if (!userId) return false

  await deleteUserAccountPermanently(userId)
  return true
}
