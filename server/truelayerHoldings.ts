import type { PlaidAccountBucket, PlaidHoldingsSnapshot, PlaidPositionRow } from './plaidHoldings.js'

export type TrueLayerAccountRecord = {
  account_id: string
  account_type?: string | null
  display_name?: string | null
  provider_id?: string | null
  currency?: string | null
  account_number?: { iban?: string | null } | null
}

export type TrueLayerBalanceRecord = {
  currency?: string | null
  available?: number | null
  current?: number | null
}

function normalizeToken(raw: string | null | undefined): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim()
}

export function truelayerAccountToBucket(
  accountType: string | null | undefined,
  displayName: string | null | undefined,
): PlaidAccountBucket {
  const t = `${normalizeToken(accountType)} ${normalizeToken(displayName)}`
  if (/\bhsa\b|health savings/.test(t)) return 'hsa'
  if (/\broth\b|\bisa\b|\blisa\b/.test(t)) return 'roth'
  if (
    /\bpension\b|\bretirement\b|\bsipp\b|\b401\b|\bira\b|\bper\b|\bfondo\b|\bplan de pensiones\b/.test(
      t,
    )
  ) {
    if (/\broth\b|\bisa\b/.test(t)) return 'roth'
    return 'trad401k'
  }
  if (/\bcredit\b|\bcard\b|\bmortgage\b|\bloan\b/.test(t)) return 'unknown'
  return 'brokerage'
}

function balanceAmount(balance: TrueLayerBalanceRecord | null | undefined): number {
  if (!balance) return 0
  const current = typeof balance.current === 'number' && Number.isFinite(balance.current) ? balance.current : 0
  const available =
    typeof balance.available === 'number' && Number.isFinite(balance.available) ? balance.available : 0
  const pick = current > 0 ? current : available
  return Math.max(0, Math.round(pick))
}

export function buildTrueLayerHoldingsSnapshot(input: {
  connectionId: string
  institutionName: string
  accounts: TrueLayerAccountRecord[]
  balancesByAccountId: Map<string, TrueLayerBalanceRecord>
}): PlaidHoldingsSnapshot {
  const rows: PlaidPositionRow[] = []
  const totals = { base401k: 0, baseSE401k: 0, baseRoth: 0, baseHsa: 0, brkBal: 0 }

  for (const account of input.accounts) {
    const accountId = account.account_id?.trim()
    if (!accountId) continue
    const name = account.display_name?.trim() || 'Bank account'
    const bucket = truelayerAccountToBucket(account.account_type, name)
    if (bucket === 'unknown') continue
    const value = balanceAmount(input.balancesByAccountId.get(accountId))
    if (value <= 0) continue

    rows.push({
      accountName: name,
      symbol: accountId.slice(0, 8).toUpperCase(),
      description: name,
      quantity: 1,
      lastPrice: value,
      currentValue: value,
      costBasis: null,
      dailyChangeDollar: null,
      dailyChangePercent: null,
      calculatorBucket: bucket,
    })

    switch (bucket) {
      case 'trad401k':
        totals.base401k += value
        break
      case 'se401k':
        totals.baseSE401k += value
        break
      case 'roth':
        totals.baseRoth += value
        break
      case 'hsa':
        totals.baseHsa += value
        break
      case 'brokerage':
        totals.brkBal += value
        break
      default:
        break
    }
  }

  return {
    itemId: input.connectionId,
    institutionName: input.institutionName,
    rows,
    balances: {
      base401k: Math.round(totals.base401k),
      baseSE401k: Math.round(totals.baseSE401k),
      baseRoth: Math.round(totals.baseRoth),
      baseHsa: Math.round(totals.baseHsa),
      brkBal: Math.round(totals.brkBal),
    },
  }
}
