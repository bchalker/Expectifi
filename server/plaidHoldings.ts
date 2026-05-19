import type { Holding, InvestmentAccount, Security } from 'plaid'

export type PlaidAccountBucket =
  | 'trad401k'
  | 'se401k'
  | 'roth'
  | 'hsa'
  | 'brokerage'
  | 'unknown'

export type PlaidPositionRow = {
  accountName: string
  symbol: string
  description: string
  quantity: number
  lastPrice: number
  currentValue: number
  costBasis: number | null
  dailyChangeDollar: null
  dailyChangePercent: null
  calculatorBucket?: PlaidAccountBucket
}

export type PlaidHoldingsSnapshot = {
  itemId: string
  institutionName: string
  rows: PlaidPositionRow[]
  balances: {
    base401k: number
    baseSE401k: number
    baseRoth: number
    baseHsa: number
    brkBal: number
  }
}

function plaidSubtypeToBucket(subtype: string | null | undefined, type: string | null | undefined): PlaidAccountBucket {
  const s = String(subtype ?? '').toLowerCase()
  const t = String(type ?? '').toLowerCase()

  if (/\broth\b/.test(s)) return 'roth'
  if (/\bhsa\b/.test(s)) return 'hsa'
  if (/\bsep\b|\bsimple\b|\bsolo\b|\bself[-\s]?employ/.test(s)) return 'se401k'
  if (/\b401\b|\b403\b|\b457\b|\bpension\b|\btsp\b/.test(s)) return 'trad401k'
  if (/\bira\b|\bkeogh\b/.test(s)) return 'trad401k'
  if (t === 'investment' || t === 'brokerage' || /\bbrokerage\b|\bcash management\b/.test(s)) return 'brokerage'
  return 'unknown'
}

function accountLabel(institutionName: string, account: InvestmentAccount): string {
  const name = account.name?.trim() || account.official_name?.trim() || 'Account'
  const mask = account.mask?.trim()
  const suffix = mask ? ` ·••${mask}` : ''
  return `${institutionName} — ${name}${suffix}`
}

function securityById(securities: Security[]): Map<string, Security> {
  const map = new Map<string, Security>()
  for (const sec of securities) {
    if (sec.security_id) map.set(sec.security_id, sec)
  }
  return map
}

function holdingsByAccount(holdings: Holding[]): Map<string, Holding[]> {
  const map = new Map<string, Holding[]>()
  for (const h of holdings) {
    const id = h.account_id
    if (!id) continue
    const list = map.get(id) ?? []
    list.push(h)
    map.set(id, list)
  }
  return map
}

function roundMoney(n: number): number {
  return Math.round(Number.isFinite(n) ? n : 0)
}

function totalsFromRows(rows: PlaidPositionRow[]) {
  const totals = { trad401k: 0, se401k: 0, roth: 0, hsa: 0, brokerage: 0 }
  for (const r of rows) {
    const bucket = r.calculatorBucket ?? 'unknown'
    if (bucket === 'unknown') continue
    totals[bucket] += r.currentValue
  }
  return totals
}

export function buildPlaidHoldingsSnapshot(args: {
  itemId: string
  institutionName: string
  accounts: InvestmentAccount[]
  holdings: Holding[]
  securities: Security[]
}): PlaidHoldingsSnapshot {
  const { itemId, institutionName, accounts, holdings, securities } = args
  const secMap = securityById(securities)
  const byAccount = holdingsByAccount(holdings)
  const rows: PlaidPositionRow[] = []
  const seenAccountIds = new Set<string>()

  for (const account of accounts) {
    const accountId = account.account_id
    if (!accountId) continue
    seenAccountIds.add(accountId)
    const label = accountLabel(institutionName, account)
    const bucket = plaidSubtypeToBucket(account.subtype ?? null, account.type ?? null)
    const accountHoldings = byAccount.get(accountId) ?? []

    if (accountHoldings.length === 0) {
      const value = roundMoney(account.balances?.current ?? account.balances?.available ?? 0)
      if (value <= 0) continue
      rows.push({
        accountName: label,
        symbol: 'CASH',
        description: 'Account balance',
        quantity: 1,
        lastPrice: value,
        currentValue: value,
        costBasis: null,
        dailyChangeDollar: null,
        dailyChangePercent: null,
        calculatorBucket: bucket,
      })
      continue
    }

    for (const h of accountHoldings) {
      const sec = h.security_id ? secMap.get(h.security_id) : undefined
      const symbol = (sec?.ticker_symbol ?? sec?.isin ?? 'UNKNOWN').trim() || 'UNKNOWN'
      const description = (sec?.name ?? symbol).trim() || symbol
      const quantity = Number(h.quantity ?? 0)
      const currentValue = roundMoney(h.institution_value ?? 0)
      const lastPrice =
        quantity !== 0
          ? roundMoney(h.institution_price ?? currentValue / quantity)
          : roundMoney(h.institution_price ?? sec?.close_price ?? 0)
      const costBasisRaw = h.cost_basis
      const costBasis =
        typeof costBasisRaw === 'number' && Number.isFinite(costBasisRaw) ? roundMoney(costBasisRaw) : null

      rows.push({
        accountName: label,
        symbol,
        description,
        quantity,
        lastPrice,
        currentValue,
        costBasis,
        dailyChangeDollar: null,
        dailyChangePercent: null,
        calculatorBucket: bucket,
      })
    }
  }

  const totals = totalsFromRows(rows)
  return {
    itemId,
    institutionName,
    rows,
    balances: {
      base401k: roundMoney(totals.trad401k),
      baseSE401k: roundMoney(totals.se401k),
      baseRoth: roundMoney(totals.roth),
      baseHsa: roundMoney(totals.hsa),
      brkBal: roundMoney(totals.brokerage),
    },
  }
}
