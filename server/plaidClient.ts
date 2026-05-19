import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

let client: PlaidApi | null = null

function resolvePlaidEnv(): string | null {
  const raw = process.env.PLAID_ENV?.trim().toLowerCase()
  if (raw === 'sandbox') return PlaidEnvironments.sandbox
  if (raw === 'development') return PlaidEnvironments.development
  if (raw === 'production') return PlaidEnvironments.production
  return null
}

export function isPlaidConfigured(): boolean {
  const clientId = process.env.PLAID_CLIENT_ID?.trim()
  const secret = process.env.PLAID_SECRET?.trim()
  return Boolean(clientId && secret && resolvePlaidEnv())
}

export function getPlaidClient(): PlaidApi {
  if (client) return client
  const clientId = process.env.PLAID_CLIENT_ID?.trim()
  const secret = process.env.PLAID_SECRET?.trim()
  const basePath = resolvePlaidEnv()
  if (!clientId || !secret || !basePath) {
    throw new Error('plaid_not_configured')
  }
  client = new PlaidApi(
    new Configuration({
      basePath,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': clientId,
          'PLAID-SECRET': secret,
        },
      },
    }),
  )
  return client
}
