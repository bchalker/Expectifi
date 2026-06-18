import type { BrokerSource } from './brokerMonogram'
import { resolveBrokerSource } from './brokerMonogram'

export type AccountBucket = 'trad401k' | 'se401k' | 'roth' | 'hsa' | 'brokerage' | 'unknown'

export type { BrokerSource } from './brokerMonogram'

/** Fidelity Positions export row (normalized headers). */
export type ImportedPositionRow = {
  accountName: string
  symbol: string
  description: string
  quantity: number
  lastPrice: number
  currentValue: number
  /** From CSV when a cost-basis column exists; otherwise null. */
  costBasis: number | null
  /** Today's $ change when the export includes a gain/loss column; otherwise null. */
  dailyChangeDollar: number | null
  /** Today's percent change (percent points, e.g. -1.2 for -1.2%) when present; otherwise null. */
  dailyChangePercent: number | null
  /**
   * When set (e.g. after import review), overrides `mapAccountToBucket(accountName)` for totals,
   * UI grouping, and calculator retirement buckets.
   */
  calculatorBucket?: AccountBucket
  /** Import / link source for broker monogram display. */
  brokerSource?: BrokerSource
  /** Subtle warning when the same symbol exists in CSV and Plaid for one broker (keep-both resolution). */
  plaidOverlapWarning?: boolean
}

/** Fidelity appends trailing `*` markers to some symbols (e.g. money market); strip for display/import. */
export function normalizeImportSymbol(symbol: string): string {
  return String(symbol).replace(/\*+$/g, '').trim()
}

/** Fidelity synthetic row for unsettled cash (e.g. "Pending activity" / cash debit). Excluded from holdings UI and return models; included in account/bucket balance totals. */
export function isPendingActivityImportRow(r: ImportedPositionRow): boolean {
  const sym = normalizeImportSymbol(r.symbol).toLowerCase()
  const desc = r.description.trim().toLowerCase()
  if (sym === 'pending activity' || desc === 'pending activity') return true
  if (sym.includes('pending activity') || desc.includes('pending activity')) return true
  if (desc.includes('unsettled activity')) return true
  return false
}

/** Common sweep / government money market-style symbols (Fidelity, Schwab, Vanguard, etc.). */
const MONEY_MARKET_STYLE_SYMBOLS = new Set(
  [
    'SPAXX',
    'SPRXX',
    'FZFXX',
    'FDRXX',
    'FDLXX',
    'FCASH',
    'FCFXX',
    'FSPXX',
    'FISXX',
    'FMPXX',
    'SWVXX',
    'VMFXX',
    'VMMXX',
    'VUSXX',
    'MSAXX',
    'TMCXX',
    'TFFXX',
    'GVMXX',
    'SNVXX',
    'SNAXX',
  ].map((s) => s.toUpperCase()),
)

/** True when this import row is very likely a money market / cash sweep style fund. */
export function isMoneyMarketImportRow(r: ImportedPositionRow): boolean {
  const sym = normalizeImportSymbol(r.symbol).toUpperCase()
  if (sym && MONEY_MARKET_STYLE_SYMBOLS.has(sym)) return true
  const desc = r.description.trim().toLowerCase()
  if (desc.includes('money market')) return true
  if (desc.includes('government cash')) return true
  if (desc.includes('cash reserves')) return true
  if (desc.includes('fidelity government')) return true
  return false
}

export type ParsedPositionsCsv = {
  headers: string[]
  rows: ImportedPositionRow[]
  /** Per-bucket sum of Current Value */
  totals: Record<Exclude<AccountBucket, 'unknown'>, number>
  unknownAccounts: Set<string>
}

const EXPECTED = ['account name', 'symbol', 'description', 'quantity', 'last price', 'current value']

/** Optional cost basis columns — exact header names after normalizeHeader (first total-style match wins). */
const COST_BASIS_TOTAL_HEADERS = [
  'cost basis total',
  'total cost basis',
  'cost basis',
  'tax cost basis',
  'average cost basis',
  'avg cost basis',
] as const

function resolveCostBasisColumn(headers: string[]): { index: number; mode: 'total' | 'per_share' } | null {
  for (const name of COST_BASIS_TOTAL_HEADERS) {
    const i = headers.indexOf(name)
    if (i >= 0) return { index: i, mode: 'total' }
  }
  const perShare = headers.indexOf('cost basis per share')
  if (perShare >= 0) return { index: perShare, mode: 'per_share' }
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]
    if (h.includes('cost basis') && !h.includes('per share') && !h.includes('percent')) {
      return { index: i, mode: 'total' }
    }
  }
  return null
}

function parseCostBasisForRow(
  cells: string[],
  spec: { index: number; mode: 'total' | 'per_share' } | null,
  quantity: number,
): number | null {
  if (!spec) return null
  const raw = cells[spec.index] ?? ''
  if (spec.mode === 'total') return parseMoneyMaybe(raw)
  const t = String(raw).replace(/[$,]/g, '').trim()
  if (!t) return null
  const per = parseFloat(t)
  if (!Number.isFinite(per) || quantity <= 0) return null
  return Math.round(quantity * per)
}

function parseMoneyMaybe(s: string): number | null {
  const t = String(s).replace(/[$,]/g, '').trim()
  if (!t) return null
  const v = parseFloat(t)
  return Number.isFinite(v) ? v : null
}

function parseSignedMoneyMaybe(s: string): number | null {
  const raw = String(s ?? '').trim()
  if (!raw) return null
  let t = raw.replace(/[$,]/g, '')
  const paren = /^\(([^)]+)\)$/.exec(t.replace(/\s/g, ''))
  if (paren) t = `-${paren[1]}`
  const v = parseFloat(t.replace(/,/g, ''))
  return Number.isFinite(v) ? v : null
}

function parsePercentPointsMaybe(s: string): number | null {
  const raw = String(s ?? '').trim()
  if (!raw) return null
  let t = raw.replace(/%/g, '').replace(/,/g, '')
  const paren = /^\(([^)]+)\)$/.exec(t.replace(/\s/g, ''))
  if (paren) t = `-${paren[1]}`
  const v = parseFloat(t)
  return Number.isFinite(v) ? v : null
}

function resolveDailyChangeColumnIndices(headers: string[]): { iDollar: number; iPct: number } {
  const dollarCandidates = [
    "today's gain/loss dollar",
    "today's gain/loss $",
    'today gain/loss dollar',
    'todays gain/loss dollar',
    '$ today',
    'daily change ($)',
    'change ($)',
    'daily gain/loss',
    'gain/loss $',
  ]
  const pctCandidates = [
    "today's gain/loss percent",
    "today's gain/loss %",
    'today gain/loss percent',
    'todays gain/loss percent',
    '% today',
    'daily change (%)',
    'change (%)',
    'daily %',
    'gain/loss %',
  ]
  let iDollar = -1
  for (const c of dollarCandidates) {
    iDollar = headers.indexOf(c)
    if (iDollar >= 0) break
  }
  let iPct = -1
  for (const c of pctCandidates) {
    iPct = headers.indexOf(c)
    if (iPct >= 0) break
  }
  if (iPct < 0) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i] ?? ''
      if (h.includes('gain') && h.includes('loss') && h.includes('%')) {
        iPct = i
        break
      }
    }
  }
  return { iDollar, iPct }
}

export function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Split CSV line respecting double-quoted fields. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && c === ',') {
      out.push(cur)
      cur = ''
      continue
    }
    cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function parseMoney(s: string): number {
  const v = parseFloat(String(s).replace(/[$,]/g, '').trim())
  return Number.isFinite(v) ? v : 0
}

function parseNum(s: string): number {
  const v = parseFloat(String(s).replace(/,/g, '').trim())
  return Number.isFinite(v) ? v : 0
}

export function mapRowToBucket(r: ImportedPositionRow): AccountBucket {
  return r.calculatorBucket ?? mapAccountToBucket(r.accountName)
}

/**
 * Map custodian account label text to calculator buckets (pre-tax is split into trad vs SEP/SIMPLE/solo for the model).
 */
export function mapAccountToBucket(accountName: string): AccountBucket {
  const n = accountName.toLowerCase()

  if (/\broth\b/.test(n)) return 'roth'

  if (/\bhsa\b|health savings/.test(n)) return 'hsa'

  if (
    /\bbrokerage\b/.test(n) ||
    /\bindividual\b/.test(n) ||
    /\binvesting\b/.test(n) ||
    /\bnon-?retirement\b/.test(n) ||
    /\btaxable\b/.test(n)
  )
    return 'brokerage'

  if (
    /\bsep\b/.test(n) ||
    /\bsimple\b/.test(n) ||
    /\bself[-\s]?employ/.test(n) ||
    /\bsolo\s*401/.test(n) ||
    /\bse\s*401/.test(n) ||
    /\bone[-\s]?participant\b/.test(n)
  )
    return 'se401k'

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
    /\bretirement\b/.test(n)
  )
    return 'trad401k'

  if (/\bira\b/.test(n)) return 'trad401k'

  return 'unknown'
}

export type TaxTreatmentBucket = 'pretax' | 'roth' | 'hsa' | 'brokerage' | 'unknown'

export function taxTreatmentFromCalculatorBucket(b: AccountBucket): TaxTreatmentBucket {
  if (b === 'trad401k' || b === 'se401k') return 'pretax'
  if (b === 'roth') return 'roth'
  if (b === 'hsa') return 'hsa'
  if (b === 'brokerage') return 'brokerage'
  return 'unknown'
}

export function positionsForTaxTreatment(
  rows: ImportedPositionRow[],
  tax: Exclude<TaxTreatmentBucket, 'unknown'>,
): ImportedPositionRow[] {
  return rows.filter((r) => !isPendingActivityImportRow(r) && taxTreatmentFromCalculatorBucket(mapRowToBucket(r)) === tax)
}

export function fidelityAccountKey(accountName: string): string {
  return accountName.trim() || '(blank)'
}

export function uniqueAccountKeysFromRows(rows: ImportedPositionRow[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const r of rows) {
    if (isPendingActivityImportRow(r)) continue
    const k = fidelityAccountKey(r.accountName)
    if (seen.has(k)) continue
    seen.add(k)
    order.push(k)
  }
  return order
}

export function buildDefaultAccountAssignments(rows: ImportedPositionRow[]): Record<string, AccountBucket> {
  const m: Record<string, AccountBucket> = {}
  for (const k of uniqueAccountKeysFromRows(rows)) {
    const label = k === '(blank)' ? '' : k
    m[k] = mapAccountToBucket(label)
  }
  return m
}

export function applyBucketAssignmentsToRows(
  rows: ImportedPositionRow[],
  byAccount: Record<string, AccountBucket>,
): ImportedPositionRow[] {
  return rows.map((r) => {
    if (isPendingActivityImportRow(r)) return r
    const k = fidelityAccountKey(r.accountName)
    const b = byAccount[k]
    if (b === undefined) return r
    return { ...r, calculatorBucket: b }
  })
}

/** Options for import review `<select>` (excludes unknown — user must pick one of these). */
export const IMPORT_ACCOUNT_BUCKET_SELECT_OPTIONS: { value: Exclude<AccountBucket, 'unknown'>; label: string }[] = [
  { value: 'trad401k', label: 'Pre-tax — 401(k), rollover IRA, 403(b), etc.' },
  { value: 'se401k', label: 'Pre-tax — SEP / SIMPLE / solo 401(k)' },
  { value: 'roth', label: 'Roth — IRA / 401(k) / 403(b)' },
  { value: 'hsa', label: 'HSA' },
  { value: 'brokerage', label: 'Brokerage / taxable' },
]

export function parseFidelityPositionsCsv(text: string): ParsedPositionsCsv {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) {
    return { headers: [], rows: [], totals: { trad401k: 0, se401k: 0, roth: 0, hsa: 0, brokerage: 0 }, unknownAccounts: new Set() }
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader)
  const idx = (name: string) => headers.indexOf(name)

  const iAcc = idx('account name')
  const iSym = idx('symbol')
  const iDesc = idx('description')
  const iQty = idx('quantity')
  const iPrice = idx('last price')
  const iVal = idx('current value')

  const costSpec = resolveCostBasisColumn(headers)
  const { iDollar, iPct } = resolveDailyChangeColumnIndices(headers)

  if ([iAcc, iSym, iDesc, iQty, iPrice, iVal].some((i) => i < 0)) {
    throw new Error(
      `Missing required columns. Expected headers like: ${EXPECTED.join(', ')}. Found: ${headers.join(' | ')}`,
    )
  }

  const rows: ImportedPositionRow[] = []
  const totals: ParsedPositionsCsv['totals'] = { trad401k: 0, se401k: 0, roth: 0, hsa: 0, brokerage: 0 }
  const unknownAccounts = new Set<string>()
  let contextAccount = ''

  for (let li = 1; li < lines.length; li++) {
    const rawCells = splitCsvLine(lines[li])
    if (rawCells.length === 0) continue
    const cells = [...rawCells]
    while (cells.length < headers.length) cells.push('')
    const accRaw = (cells[iAcc] ?? '').trim()
    if (accRaw) contextAccount = accRaw
    const accountName = accRaw || contextAccount
    const symbol = normalizeImportSymbol(cells[iSym] ?? '')
    const description = cells[iDesc] ?? ''
    const quantity = parseNum(cells[iQty] ?? '0')
    const lastPrice = parseMoney(cells[iPrice] ?? '0')
    const currentValue = parseMoney(cells[iVal] ?? '0')
    const costBasis = parseCostBasisForRow(cells, costSpec, quantity)
    const dailyChangeDollar = iDollar >= 0 ? parseSignedMoneyMaybe(cells[iDollar] ?? '') : null
    const dailyChangePercent = iPct >= 0 ? parsePercentPointsMaybe(cells[iPct] ?? '') : null
    if (!accountName && !symbol) continue

    const row: ImportedPositionRow = {
      accountName,
      symbol,
      description,
      quantity,
      lastPrice,
      currentValue,
      costBasis,
      dailyChangeDollar,
      dailyChangePercent,
    }

    const bucket = mapRowToBucket(row)
    if (bucket === 'unknown') unknownAccounts.add(fidelityAccountKey(accountName))
    else totals[bucket] += currentValue

    rows.push(row)
  }

  return { headers, rows, totals, unknownAccounts }
}

/** Sum current value by mapped bucket from position rows (includes pending-activity adjustments). */
export function totalsFromPositionRows(rows: ImportedPositionRow[]): ParsedPositionsCsv['totals'] {
  const totals: ParsedPositionsCsv['totals'] = { trad401k: 0, se401k: 0, roth: 0, hsa: 0, brokerage: 0 }
  for (const r of rows) {
    const bucket = mapRowToBucket(r)
    if (bucket !== 'unknown') totals[bucket] += r.currentValue
  }
  return totals
}

export function totalsToCalculatorBases(totals: ParsedPositionsCsv['totals']) {
  return {
    base401k: Math.round(totals.trad401k),
    baseSE401k: Math.round(totals.se401k),
    baseRoth: Math.round(totals.roth),
    baseHsa: Math.round(totals.hsa),
    brkBal: Math.round(totals.brokerage),
  }
}

/** Human-readable calculator bucket label for a mapped Fidelity account. */
export function accountBucketLabel(bucket: AccountBucket): string {
  switch (bucket) {
    case 'trad401k':
      return 'Traditional 401(k)'
    case 'se401k':
      return 'Solo / SE 401(k)'
    case 'roth':
      return 'Roth'
    case 'hsa':
      return 'HSA'
    case 'brokerage':
      return 'Brokerage'
    case 'unknown':
      return 'Unmapped'
  }
}

export type ImportedAccountGroup = {
  /** Raw account name from the CSV. */
  accountName: string
  bucket: AccountBucket
  calculatorLabel: string
  total: number
  rows: ImportedPositionRow[]
  brokerSource: BrokerSource
}

/** Group position rows by Fidelity account for UI breakdowns. */
export function groupPositionsByAccount(rows: ImportedPositionRow[]): ImportedAccountGroup[] {
  const byName = new Map<string, ImportedPositionRow[]>()
  for (const r of rows) {
    const key = r.accountName.trim() || '(Unnamed account)'
    const list = byName.get(key)
    if (list) list.push(r)
    else byName.set(key, [r])
  }
  const out: ImportedAccountGroup[] = []
  for (const [accountName, groupRows] of byName) {
    const holdingRows = groupRows.filter((r) => !isPendingActivityImportRow(r))
    const bucket = mapRowToBucket(holdingRows[0] ?? groupRows[0]!)
    const total = groupRows.reduce((s, x) => s + x.currentValue, 0)
    holdingRows.sort((a, b) => b.currentValue - a.currentValue)
    out.push({
      accountName,
      bucket,
      calculatorLabel: accountBucketLabel(bucket),
      total,
      rows: holdingRows,
      brokerSource: resolveBrokerSource(holdingRows[0] ?? groupRows[0]!),
    })
  }
  return out
}

/** One row per ticker after merging lines in `rows` (e.g. all positions in a tax bucket). */
export type AggregatedSymbolRow = {
  symbol: string
  description: string
  quantity: number
  lastPrice: number
  currentValue: number
  costBasis: number | null
  /** How many import lines were rolled into this row */
  lineCount: number
  /** Raw rows merged into this aggregate (same references as input). */
  contributingRows: ImportedPositionRow[]
  /** Sum of line daily $ changes when available */
  dailyChangeDollar: number | null
  /** Value-weighted average of line daily % when available */
  dailyChangePercent: number | null
}

/**
 * Sum holdings by normalized symbol within a set of rows (same tax treatment, multiple accounts).
 * Last price is a value-weighted blend when quantity is zero on source lines (typical for custodian CSV exports).
 */
export function aggregatePositionsBySymbol(rows: ImportedPositionRow[]): AggregatedSymbolRow[] {
  type Acc = {
    symbolDisplay: string
    bestVal: number
    descriptions: Map<string, number>
    quantity: number
    lastNum: number
    lastDen: number
    currentValue: number
    costParts: number[]
    lineCount: number
    contributingRows: ImportedPositionRow[]
    dailyDollarSum: number
    dailyDollarAny: boolean
    dailyPctNum: number
    dailyPctDen: number
  }
  const m = new Map<string, Acc>()

  for (const r of rows) {
    if (isPendingActivityImportRow(r)) continue
    const symNorm = normalizeImportSymbol(r.symbol)
    const key = symNorm.toUpperCase() || '__EMPTY__'
    const disp = symNorm || '—'
    let acc = m.get(key)
    if (!acc) {
      acc = {
        symbolDisplay: disp,
        bestVal: -1,
        descriptions: new Map(),
        quantity: 0,
        lastNum: 0,
        lastDen: 0,
        currentValue: 0,
        costParts: [],
        lineCount: 0,
        contributingRows: [],
        dailyDollarSum: 0,
        dailyDollarAny: false,
        dailyPctNum: 0,
        dailyPctDen: 0,
      }
      m.set(key, acc)
    }
    if (r.currentValue > acc.bestVal) {
      acc.bestVal = r.currentValue
      acc.symbolDisplay = disp
    }
    acc.quantity += r.quantity
    acc.currentValue += r.currentValue
    acc.lineCount += 1
    acc.contributingRows.push(r)
    if (r.costBasis != null && Number.isFinite(r.costBasis)) acc.costParts.push(r.costBasis)
    if (r.dailyChangeDollar != null && Number.isFinite(r.dailyChangeDollar)) {
      acc.dailyDollarSum += r.dailyChangeDollar
      acc.dailyDollarAny = true
    }
    if (r.dailyChangePercent != null && Number.isFinite(r.dailyChangePercent) && r.currentValue > 0) {
      acc.dailyPctNum += r.dailyChangePercent * r.currentValue
      acc.dailyPctDen += r.currentValue
    }

    const lp = r.lastPrice
    if (Number.isFinite(lp)) {
      if (r.quantity > 0) {
        acc.lastNum += lp * r.quantity
        acc.lastDen += r.quantity
      } else if (r.currentValue > 0) {
        acc.lastNum += lp * r.currentValue
        acc.lastDen += r.currentValue
      }
    }

    const d = r.description.trim()
    if (d) acc.descriptions.set(d, (acc.descriptions.get(d) ?? 0) + r.currentValue)
  }

  const out: AggregatedSymbolRow[] = []
  for (const [, acc] of m) {
    let description = ''
    let bestDescVal = -1
    for (const [d, v] of acc.descriptions) {
      if (v > bestDescVal) {
        bestDescVal = v
        description = d
      }
    }
    const lastPrice = acc.lastDen > 0 ? acc.lastNum / acc.lastDen : 0
    const costBasis = acc.costParts.length ? acc.costParts.reduce((s, x) => s + x, 0) : null
    const dailyChangeDollar = acc.dailyDollarAny ? acc.dailyDollarSum : null
    const dailyChangePercent = acc.dailyPctDen > 0 ? acc.dailyPctNum / acc.dailyPctDen : null
    out.push({
      symbol: acc.symbolDisplay,
      description,
      quantity: acc.quantity,
      lastPrice,
      currentValue: acc.currentValue,
      costBasis,
      lineCount: acc.lineCount,
      contributingRows: acc.contributingRows,
      dailyChangeDollar,
      dailyChangePercent,
    })
  }
  out.sort((a, b) => b.currentValue - a.currentValue)
  return out
}

export type HoldingAccountBreakdown = {
  accountKey: string
  accountLabel: string
  quantity: number
  currentValue: number
  costBasis: number | null
  brokerSource: BrokerSource
}

/** Short label for a source account row (Plaid "Institution — Account ·••1234" or CSV account name). */
export function shortSourceAccountLabel(accountName: string): string {
  const dash = accountName.indexOf(' — ')
  if (dash >= 0) {
    const rest = accountName.slice(dash + 3)
    const dot = rest.indexOf(' ·')
    const accountPart = (dot >= 0 ? rest.slice(0, dot) : rest).trim()
    if (accountPart) return accountPart
    return accountName.slice(0, dash).trim()
  }
  return accountName.trim()
}

/** Per-account lines for one aggregated symbol row (multiple Plaid/CSV source accounts). */
export function breakdownAggregateByAccount(row: AggregatedSymbolRow): HoldingAccountBreakdown[] {
  const byAccount = new Map<string, ImportedPositionRow[]>()
  for (const r of row.contributingRows) {
    const key = fidelityAccountKey(r.accountName)
    const list = byAccount.get(key) ?? []
    list.push(r)
    byAccount.set(key, list)
  }
  const out: HoldingAccountBreakdown[] = []
  for (const [accountKey, accountRows] of byAccount) {
    const quantity = accountRows.reduce((s, x) => s + x.quantity, 0)
    const currentValue = accountRows.reduce((s, x) => s + x.currentValue, 0)
    const costParts = accountRows
      .map((x) => x.costBasis)
      .filter((x): x is number => x != null && Number.isFinite(x))
    out.push({
      accountKey,
      accountLabel: shortSourceAccountLabel(accountRows[0]?.accountName ?? accountKey),
      quantity,
      currentValue,
      costBasis: costParts.length ? costParts.reduce((s, x) => s + x, 0) : null,
      brokerSource: resolveBrokerSource(accountRows[0]!),
    })
  }
  out.sort((a, b) => b.currentValue - a.currentValue)
  return out
}

export function aggregateRowHasAccountBreakdown(row: AggregatedSymbolRow): boolean {
  const keys = new Set(row.contributingRows.map((r) => fidelityAccountKey(r.accountName)))
  return keys.size > 1
}

/** Rows assigned to a retirement calculator bucket (excludes brokerage / unknown). */
export function positionsForRetirementBucket(
  rows: ImportedPositionRow[],
  bucket: 'trad401k' | 'se401k' | 'roth' | 'hsa',
): ImportedPositionRow[] {
  return rows.filter((r) => mapRowToBucket(r) === bucket)
}

/** Brokerage / taxable rows from merged imports. */
export function positionsForBrokerage(rows: ImportedPositionRow[]): ImportedPositionRow[] {
  return rows.filter((r) => mapRowToBucket(r) === 'brokerage')
}
