import {
  isFidelityPendingActivityRow,
  mapRowToBucket,
  normalizeFidelityImportSymbol,
  normalizeHeader,
  splitCsvLine,
  type FidelityPositionRow,
  type ParsedFidelityCsv,
} from './fidelityCsv'

export type PositionsCsvCustodian = 'fidelity' | 'schwab' | 'vanguard' | 'other'

const POSITIONS_CSV_CUSTODIANS: PositionsCsvCustodian[] = ['fidelity', 'schwab', 'vanguard', 'other']

export function isPositionsCsvCustodian(id: string): id is PositionsCsvCustodian {
  return (POSITIONS_CSV_CUSTODIANS as string[]).includes(id)
}

export type OtherColumnMap = {
  symbol: string
  name: string
  currentValue: string
  /** Empty string = no column / cost basis always null */
  costBasis: string
}

function stripBom(text: string) {
  return text.replace(/^\uFEFF/, '')
}

function csvLines(text: string): string[] {
  return stripBom(text)
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
}

/** Strip $ , % and whitespace for numeric parsing. */
export function parseNumericCell(raw: string): number {
  const t = String(raw)
    .replace(/%/g, '')
    .replace(/[$,]/g, '')
    .trim()
  if (!t) return 0
  const v = parseFloat(t)
  return Number.isFinite(v) ? v : 0
}

const COST_BASIS_NULL_MARKERS = new Set(['', 'n/a', 'na', '--', '—', '-'])

export function parseCostBasisNullable(raw: string): number | null {
  const t = String(raw)
    .replace(/%/g, '')
    .replace(/[$,]/g, '')
    .trim()
    .toLowerCase()
  if (COST_BASIS_NULL_MARKERS.has(t)) return null
  const v = parseFloat(t)
  return Number.isFinite(v) ? v : null
}

function emptyParsed(): ParsedFidelityCsv {
  return {
    headers: [],
    rows: [],
    totals: { trad401k: 0, se401k: 0, roth: 0, hsa: 0, brokerage: 0 },
    unknownAccounts: new Set(),
  }
}

function accumulateTotals(rows: FidelityPositionRow[]): ParsedFidelityCsv {
  const totals: ParsedFidelityCsv['totals'] = { trad401k: 0, se401k: 0, roth: 0, hsa: 0, brokerage: 0 }
  const unknownAccounts = new Set<string>()
  for (const r of rows) {
    if (isFidelityPendingActivityRow(r)) continue
    const bucket = mapRowToBucket(r)
    if (bucket === 'unknown') unknownAccounts.add(r.accountName.trim() || '(blank)')
    else totals[bucket] += r.currentValue
  }
  return { headers: [], rows, totals, unknownAccounts }
}

const DEFAULT_IMPORT_ACCOUNT = 'Individual · CSV import'

function rowFromHolding(
  accountName: string,
  symbol: string,
  name: string,
  currentValue: number,
  costBasis: number | null,
): FidelityPositionRow {
  return {
    accountName,
    symbol: normalizeFidelityImportSymbol(symbol),
    description: name,
    quantity: 0,
    lastPrice: 0,
    currentValue: Math.round(currentValue),
    costBasis,
    dailyChangeDollar: null,
    dailyChangePercent: null,
  }
}

/** Fidelity: header row is first row containing a cell exactly `Symbol`; skip trailing summary rows. */
export function parseFidelityPositionsExport(text: string): ParsedFidelityCsv {
  const lines = csvLines(text)
  if (lines.length < 2) return emptyParsed()

  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    if (cells.some((c) => c.trim() === 'Symbol')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx < 0) return emptyParsed()

  const rawHeaderCells = splitCsvLine(lines[headerIdx])
  const headers = rawHeaderCells.map(normalizeHeader)
  const idx = (name: string) => headers.indexOf(normalizeHeader(name))

  const iAcc = idx('Account Name')
  const iSym = idx('Symbol')
  const iDesc = idx('Description')
  const iVal = idx('Current Value')
  let iCost = idx('Cost Basis Total')
  if (iCost < 0) iCost = idx('Total Cost Basis')

  if (iSym < 0 || iDesc < 0 || iVal < 0) return emptyParsed()

  const rows: FidelityPositionRow[] = []
  let contextAccount = ''

  for (let li = headerIdx + 1; li < lines.length; li++) {
    const rawCells = splitCsvLine(lines[li])
    if (rawCells.length === 0) continue
    const cells = [...rawCells]
    while (cells.length < rawHeaderCells.length) cells.push('')

    const accCell = iAcc >= 0 ? (cells[iAcc] ?? '').trim() : ''
    if (accCell) contextAccount = accCell

    const symRaw = (cells[iSym] ?? '').trim()
    const symNorm = normalizeFidelityImportSymbol(symRaw)
    if (!symNorm) continue
    if (symRaw.trim().toLowerCase() === 'account total') continue

    const accountName = accCell || contextAccount || DEFAULT_IMPORT_ACCOUNT
    const description = cells[iDesc] ?? ''
    const currentValue = parseNumericCell(cells[iVal] ?? '0')
    const costRaw = iCost >= 0 ? (cells[iCost] ?? '') : ''
    const costBasis = iCost >= 0 ? parseCostBasisNullable(costRaw) : null

    const row = rowFromHolding(accountName, symRaw, description, currentValue, costBasis)
    if (isFidelityPendingActivityRow(row)) continue
    rows.push(row)
  }

  const base = accumulateTotals(rows)
  return { ...base, headers: rawHeaderCells }
}

/** Schwab: skip first row; row 2 is headers; skip trailing rows with empty Symbol or Symbol starting with `Totals`. */
export function parseSchwabPositionsExport(text: string): ParsedFidelityCsv {
  const lines = csvLines(text)
  if (lines.length < 3) return emptyParsed()

  const rawHeaderCells = splitCsvLine(lines[1])
  const headers = rawHeaderCells.map(normalizeHeader)
  const idx = (name: string) => headers.indexOf(normalizeHeader(name))

  const iSym = idx('Symbol')
  const iDesc = idx('Description')
  let iVal = idx('Market Value')
  if (iVal < 0) iVal = headers.findIndex((h) => h.startsWith('market value'))
  let iCost = idx('Cost Basis')
  if (iCost < 0) iCost = headers.findIndex((h) => h.startsWith('cost basis') && !h.includes('unrealized'))

  if (iSym < 0 || iDesc < 0 || iVal < 0) return emptyParsed()

  const rows: FidelityPositionRow[] = []
  for (let li = 2; li < lines.length; li++) {
    const rawCells = splitCsvLine(lines[li])
    if (rawCells.length === 0) continue
    const cells = [...rawCells]
    while (cells.length < rawHeaderCells.length) cells.push('')

    const symRaw = (cells[iSym] ?? '').trim()
    if (!symRaw) continue
    if (symRaw.toLowerCase().startsWith('totals')) continue

    const description = cells[iDesc] ?? ''
    const currentValue = parseNumericCell(cells[iVal] ?? '0')
    const costBasis = iCost >= 0 ? parseCostBasisNullable(cells[iCost] ?? '') : null

    rows.push(rowFromHolding(DEFAULT_IMPORT_ACCOUNT, symRaw, description, currentValue, costBasis))
  }

  const base = accumulateTotals(rows)
  return { ...base, headers: rawHeaderCells }
}

/** Vanguard brokerage: locate header row with Symbol; cost basis column absent → null. */
export function parseVanguardPositionsExport(text: string): ParsedFidelityCsv {
  const lines = csvLines(text)
  if (lines.length < 2) return emptyParsed()

  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    if (cells.some((c) => c.trim() === 'Symbol')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx < 0) return emptyParsed()

  const rawHeaderCells = splitCsvLine(lines[headerIdx])
  const headers = rawHeaderCells.map(normalizeHeader)
  const idx = (name: string) => headers.indexOf(normalizeHeader(name))

  const iSym = idx('Symbol')
  let iName = idx('Investment Name')
  if (iName < 0) iName = headers.findIndex((h) => h.includes('investment name') || (h.includes('investment') && h.includes('name')))
  let iVal = idx('Total Value')
  if (iVal < 0) iVal = headers.findIndex((h) => h.includes('total value'))

  if (iSym < 0 || iName < 0 || iVal < 0) return emptyParsed()

  const rows: FidelityPositionRow[] = []
  for (let li = headerIdx + 1; li < lines.length; li++) {
    const rawCells = splitCsvLine(lines[li])
    if (rawCells.length === 0) continue
    const cells = [...rawCells]
    while (cells.length < rawHeaderCells.length) cells.push('')

    const symRaw = (cells[iSym] ?? '').trim()
    const symNorm = normalizeFidelityImportSymbol(symRaw)
    if (!symNorm) continue

    const name = cells[iName] ?? ''
    const currentValue = parseNumericCell(cells[iVal] ?? '0')
    rows.push(rowFromHolding(DEFAULT_IMPORT_ACCOUNT, symRaw, name, currentValue, null))
  }

  const base = accumulateTotals(rows)
  return { ...base, headers: rawHeaderCells }
}

function headerIndexFromLabel(rawHeaders: string[], label: string): number {
  if (!label) return -1
  const i = rawHeaders.findIndex((h) => h.trim() === label.trim())
  return i
}

/** Other: first row = headers; map columns by user-selected labels. */
export function parseOtherPositionsExport(text: string, map: OtherColumnMap): ParsedFidelityCsv {
  const lines = csvLines(text)
  if (lines.length < 2) return emptyParsed()
  if (!map.symbol || !map.name || !map.currentValue) return emptyParsed()

  const rawHeaderCells = splitCsvLine(lines[0])
  const iSym = headerIndexFromLabel(rawHeaderCells, map.symbol)
  const iName = headerIndexFromLabel(rawHeaderCells, map.name)
  const iVal = headerIndexFromLabel(rawHeaderCells, map.currentValue)
  const iCost = map.costBasis ? headerIndexFromLabel(rawHeaderCells, map.costBasis) : -1

  if (iSym < 0 || iName < 0 || iVal < 0) return emptyParsed()

  const rows: FidelityPositionRow[] = []
  for (let li = 1; li < lines.length; li++) {
    const rawCells = splitCsvLine(lines[li])
    if (rawCells.length === 0) continue
    const cells = [...rawCells]
    while (cells.length < rawHeaderCells.length) cells.push('')

    const symRaw = (cells[iSym] ?? '').trim()
    const symNorm = normalizeFidelityImportSymbol(symRaw)
    if (!symNorm) continue

    const name = cells[iName] ?? ''
    const currentValue = parseNumericCell(cells[iVal] ?? '0')
    const costBasis = iCost >= 0 ? parseCostBasisNullable(cells[iCost] ?? '') : null

    rows.push(rowFromHolding(DEFAULT_IMPORT_ACCOUNT, symRaw, name, currentValue, costBasis))
  }

  const base = accumulateTotals(rows)
  return { ...base, headers: rawHeaderCells }
}

export function parsePositionsCsv(
  custodian: PositionsCsvCustodian,
  text: string,
  otherMap?: OtherColumnMap,
): ParsedFidelityCsv {
  switch (custodian) {
    case 'fidelity':
      return parseFidelityPositionsExport(text)
    case 'schwab':
      return parseSchwabPositionsExport(text)
    case 'vanguard':
      return parseVanguardPositionsExport(text)
    case 'other':
      return parseOtherPositionsExport(text, otherMap ?? { symbol: '', name: '', currentValue: '', costBasis: '' })
    default:
      return emptyParsed()
  }
}

export function peekCsvHeaderLabels(text: string): string[] {
  const lines = csvLines(text)
  if (!lines.length) return []
  return splitCsvLine(lines[0])
}

export function custodianDisplayName(c: PositionsCsvCustodian): string {
  switch (c) {
    case 'fidelity':
      return 'Fidelity'
    case 'schwab':
      return 'Charles Schwab'
    case 'vanguard':
      return 'Vanguard'
    case 'other':
      return 'your custodian'
    default:
      return 'your custodian'
  }
}
