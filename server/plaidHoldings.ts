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

function normalizePlaidToken(raw: string | null | undefined): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim()
}

/** Map Plaid account subtype/type to calculator buckets (matches fidelityCsv heuristics). */
export function plaidSubtypeToBucket(
  subtype: string | null | undefined,
  type: string | null | undefined,
): PlaidAccountBucket {
  const s = normalizePlaidToken(subtype)
  const t = normalizePlaidToken(type)

  if (/\bhsa\b|health savings/.test(s)) return 'hsa'
  if (/\broth\b/.test(s)) return 'roth'

  if (
    /\bsep\b/.test(s) ||
    /\bsimple\b/.test(s) ||
    /\bsolo\b/.test(s) ||
    /\bself[-\s]?employ/.test(s) ||
    /\bone[-\s]?participant\b/.test(s)
  ) {
    return 'se401k'
  }

  if (
    /401\s*k|401k|401a|403\s*b|403b|457\s*b|457b|pension|profit sharing|tsp|thrift savings|defined contribution/.test(
      s,
    )
  ) {
    return 'trad401k'
  }

  if (/\bira\b|\bkeogh\b/.test(s)) return 'trad401k'

  if (
    /\bbrokerage\b/.test(s) ||
    /\bcash management\b/.test(s) ||
    /\bindividual\b/.test(s) ||
    /\binvesting\b/.test(s) ||
    /\btaxable\b/.test(s) ||
    t === 'brokerage'
  ) {
    return 'brokerage'
  }

  return 'unknown'
}

/** Fallback when Plaid omits subtype — infer from institution account label. */
export function plaidAccountNameToBucket(accountName: string): PlaidAccountBucket {
  const n = accountName.toLowerCase()

  if (/\broth\b/.test(n)) return 'roth'
  if (/\bhsa\b|health savings/.test(n)) return 'hsa'

  if (
    /\bbrokerage\b/.test(n) ||
    /\bindividual\b/.test(n) ||
    /\binvesting\b/.test(n) ||
    /\bnon-?retirement\b/.test(n) ||
    /\btaxable\b/.test(n)
  ) {
    return 'brokerage'
  }

  if (
    /\bsep\b/.test(n) ||
    /\bsimple\b/.test(n) ||
    /\bself[-\s]?employ/.test(n) ||
    /\bsolo\s*401/.test(n) ||
    /\bse\s*401/.test(n) ||
    /\bone[-\s]?participant\b/.test(n)
  ) {
    return 'se401k'
  }

  if (
    /\b401\b/.test(n) ||
    /\b401\s*k\b/.test(n) ||
    /\b403\s*b\b/.test(n) ||
    /\b403b\b/.test(n) ||
    /\brollover\b/.test(n) ||
    /\btraditional\b/.test(n) ||
    /\btsp\b/.test(n) ||
    /\bprofit\s*sharing\b/.test(n) ||
    /\b457\b/.test(n) ||
    /\bretirement\b/.test(n) ||
    /\bpension\b/.test(n)
  ) {
    return 'trad401k'
  }

  if (/\bira\b/.test(n)) return 'trad401k'

  return 'unknown'
}

export function resolvePlaidAccountBucket(
  account: InvestmentAccount,
  institutionName: string,
): PlaidAccountBucket {
  const fromPlaid = plaidSubtypeToBucket(account.subtype ?? null, account.type ?? null)
  if (fromPlaid !== 'unknown') return fromPlaid
  const label = accountLabel(institutionName, account)
  return plaidAccountNameToBucket(label)
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

  for (const account of accounts) {
    const accountId = account.account_id
    if (!accountId) continue
    const label = accountLabel(institutionName, account)
    const bucket = resolvePlaidAccountBucket(account, institutionName)
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
        calculatorBucket: bucket === 'unknown' ? undefined : bucket,
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
        calculatorBucket: bucket === 'unknown' ? undefined : bucket,
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
