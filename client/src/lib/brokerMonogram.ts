import type { ImportedPositionRow } from './positionsCsv'
import type { PositionsImportBatch } from './positionsImportStorage'
import type { PositionsCsvCustodian } from './positionsCsvImport'

export type BrokerSource =
  | 'fidelity'
  | 'schwab'
  | 'vanguard'
  | 'webull'
  | 'other'
  | 'plaid'
  | 'manual'

export type BrokerMonogramSpec = {
  initial: string
  /** Intentional brand color (hex) or CSS token for neutral sources. */
  background: string
}

/** Brand colors are intentional; neutral sources use design tokens. */
export const BROKER_MONOGRAM: Record<BrokerSource, BrokerMonogramSpec> = {
  fidelity: { initial: 'F', background: '#169C3B' },
  schwab: { initial: 'S', background: '#00A0DF' },
  vanguard: { initial: 'V', background: '#932227' },
  webull: { initial: 'W', background: '#00C4CC' },
  other: { initial: 'O', background: 'var(--surface6)' },
  plaid: { initial: 'P', background: '#00A3FF' },
  manual: { initial: 'M', background: 'var(--text-muted)' },
}

export function custodianToBrokerSource(
  custodian: PositionsCsvCustodian,
): Exclude<BrokerSource, 'plaid' | 'manual'> {
  return custodian
}

/** Import menu options that show a colored monogram pill (not "Other"). */
export function custodianShowsMonogram(custodian: PositionsCsvCustodian): boolean {
  return custodian !== 'other'
}

export function brokerSourceForBatch(batch: PositionsImportBatch): BrokerSource {
  if (batch.plaidItemId) return 'plaid'
  return custodianToBrokerSource(batch.custodian ?? 'fidelity')
}

export function resolveBrokerSource(row: ImportedPositionRow): BrokerSource {
  if (row.brokerSource) return row.brokerSource
  return 'fidelity'
}

export function stampRowsWithBrokerSource(
  rows: ImportedPositionRow[],
  source: BrokerSource,
): ImportedPositionRow[] {
  return rows.map((r) => (r.brokerSource === source ? r : { ...r, brokerSource: source }))
}

export function enrichBatchRows(batch: PositionsImportBatch): PositionsImportBatch {
  const source = brokerSourceForBatch(batch)
  return {
    ...batch,
    rows: stampRowsWithBrokerSource(batch.rows, source),
  }
}

export function enrichImportBatches(batches: PositionsImportBatch[]): PositionsImportBatch[] {
  return batches.map(enrichBatchRows)
}
