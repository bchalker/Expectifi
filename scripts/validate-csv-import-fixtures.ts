/**
 * Validates CSV import fixtures against parsers, diff, and apply logic.
 * Run: npx tsx scripts/validate-csv-import-fixtures.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyBucketAssignmentsToRows, buildDefaultAccountAssignments } from '../client/src/lib/fidelityCsv.ts'
import { applyImportWithIntent } from '../client/src/lib/csvImportApply.ts'
import { computeCustodianImportDiff, defaultRemovedActions } from '../client/src/lib/csvImportDiff.ts'
import { parsePositionsCsv } from '../client/src/lib/positionsCsvImport.ts'
import type { StoredFidelityImportV2 } from '../client/src/lib/fidelityStorage.ts'

const FIXTURES = join(import.meta.dirname, '../test-fixtures/csv')
const BROKERAGE_ACCOUNT = 'Individual · CSV import'

function loadCsv(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8')
}

function applyFidelity(name: string, contentHash: string): StoredFidelityImportV2 {
  const parsed = parsePositionsCsv('fidelity', loadCsv(name))
  const assignments = buildDefaultAccountAssignments(parsed.rows)
  const rows = applyBucketAssignmentsToRows(parsed.rows, assignments)
  return applyImportWithIntent(null, [
    {
      contentHash,
      fileName: name,
      importedAt: new Date().toISOString(),
      rows,
      custodian: 'fidelity',
    },
  ], { intent: 'add', replaceDuplicateHashes: false })
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function countSymbol(rows: { symbol: string }[], sym: string): number {
  return rows.filter((r) => r.symbol === sym).length
}

// 1. Fresh Fidelity import
const fidelityOnly = applyFidelity('fidelity-sample.csv', 'hash-fidelity-1')
assert(fidelityOnly.batches.length === 1, 'expected one fidelity batch')

const fidelityRows = fidelityOnly.batches[0]!.rows
assert(countSymbol(fidelityRows, 'MU') === 1, 'expected 1 MU in fidelity brokerage')
assert(countSymbol(fidelityRows, 'NASA') === 1, 'expected 1 NASA in fidelity brokerage')
assert(countSymbol(fidelityRows, 'IBM') === 2, 'expected IBM in fidelity brokerage + Roth')

// 2. Add Vanguard — overlapping MU, NASA, IBM in brokerage (no dedup)
const vanguardParsed = parsePositionsCsv('vanguard', loadCsv('vanguard-sample.csv'))
const vanguardRows = applyBucketAssignmentsToRows(vanguardParsed.rows, {
  [BROKERAGE_ACCOUNT]: 'brokerage',
})
const withVanguard = applyImportWithIntent(fidelityOnly, [
  {
    contentHash: 'hash-vanguard-1',
    fileName: 'vanguard-sample.csv',
    importedAt: new Date().toISOString(),
    rows: vanguardRows,
    custodian: 'vanguard',
  },
], { intent: 'add', replaceDuplicateHashes: false })

assert(withVanguard.batches.length === 2, 'expected two batches after vanguard add')
let allRows = withVanguard.batches.flatMap((b) => b.rows)
assert(countSymbol(allRows, 'MU') === 2, `expected 2 MU after vanguard add, got ${countSymbol(allRows, 'MU')}`)
assert(countSymbol(allRows, 'NASA') === 2, `expected 2 NASA after vanguard add`)
assert(countSymbol(allRows, 'IBM') === 3, `expected 3 IBM (fidelity brokerage + roth + vanguard)`)

const expectedBrokerageAfterVanguard =
  fidelityOnly.balances.brkBal + vanguardRows.reduce((s, r) => s + r.currentValue, 0)
assert(
  withVanguard.balances.brkBal === expectedBrokerageAfterVanguard,
  `brokerage aggregate mismatch: ${withVanguard.balances.brkBal} vs ${expectedBrokerageAfterVanguard}`,
)

// 3. Add Schwab — third copy of MU, NASA, IBM in brokerage
const schwabParsed = parsePositionsCsv('schwab', loadCsv('schwab-sample.csv'))
const schwabRows = applyBucketAssignmentsToRows(schwabParsed.rows, {
  [BROKERAGE_ACCOUNT]: 'brokerage',
})
const withSchwab = applyImportWithIntent(withVanguard, [
  {
    contentHash: 'hash-schwab-1',
    fileName: 'schwab-sample.csv',
    importedAt: new Date().toISOString(),
    rows: schwabRows,
    custodian: 'schwab',
  },
], { intent: 'add', replaceDuplicateHashes: false })

allRows = withSchwab.batches.flatMap((b) => b.rows)
assert(countSymbol(allRows, 'MU') === 3, `expected 3 MU across brokerages`)
assert(countSymbol(allRows, 'NASA') === 3, `expected 3 NASA across brokerages`)
assert(countSymbol(allRows, 'IBM') === 4, `expected 4 IBM (3 brokerages + fidelity roth)`)

const expectedBrokerageAll =
  withVanguard.balances.brkBal + schwabRows.reduce((s, r) => s + r.currentValue, 0)
assert(
  withSchwab.balances.brkBal === expectedBrokerageAll,
  `brokerage aggregate after schwab: ${withSchwab.balances.brkBal} vs ${expectedBrokerageAll}`,
)

// 4. Add Webull — fourth MU/NASA/IBM in brokerage; brokerSource webull
const webullParsed = parsePositionsCsv('webull', loadCsv('webull-sample.csv'))
assert(webullParsed.rows.length === 10, `webull rows: ${webullParsed.rows.length}`)
const webullRows = applyBucketAssignmentsToRows(
  webullParsed.rows,
  buildDefaultAccountAssignments(webullParsed.rows),
)
const withWebull = applyImportWithIntent(withSchwab, [
  {
    contentHash: 'hash-webull-1',
    fileName: 'webull-sample.csv',
    importedAt: new Date().toISOString(),
    rows: webullRows,
    custodian: 'webull',
  },
], { intent: 'add', replaceDuplicateHashes: false })

allRows = withWebull.batches.flatMap((b) => b.rows)
assert(countSymbol(allRows, 'MU') === 4, `expected 4 MU after webull`)
const webullBatch = withWebull.batches.find((b) => b.custodian === 'webull')!
assert(webullBatch.rows.every((r) => r.brokerSource === 'webull'), 'webull batch tagged')

// 5. Update Fidelity with diff
const updateParsed = parsePositionsCsv('fidelity', loadCsv('fidelity-sample-update.csv'))
const updateAssignments = buildDefaultAccountAssignments(updateParsed.rows)
const updateRows = applyBucketAssignmentsToRows(updateParsed.rows, updateAssignments)
const diff = computeCustodianImportDiff(withWebull, updateRows, 'fidelity')

assert(diff.counts.updated === 1, `updated: ${diff.counts.updated} (expected MU)`)
assert(diff.counts.added === 1, `added: ${diff.counts.added} (expected MSFT)`)
assert(diff.counts.unchanged === 8, `unchanged: ${diff.counts.unchanged}`)
assert(diff.counts.removed === 2, `removed: ${diff.counts.removed} (SPAXX, FDTX)`)

const removedActions = defaultRemovedActions(diff.removed)
const afterUpdate = applyImportWithIntent(withWebull, [
  {
    contentHash: 'hash-fidelity-update',
    fileName: 'fidelity-sample-update.csv',
    importedAt: new Date().toISOString(),
    rows: updateRows,
    custodian: 'fidelity',
  },
], {
  intent: 'update',
  replaceDuplicateHashes: false,
  removedActions,
})

const fidelityBatchAfter = afterUpdate.batches.find((b) => (b.custodian ?? 'fidelity') === 'fidelity')!
const symbols = new Set(fidelityBatchAfter.rows.map((r) => r.symbol))
assert(symbols.has('SPAXX'), 'SPAXX kept by default')
assert(symbols.has('FDTX'), 'FDTX kept by default')
assert(symbols.has('MSFT'), 'MSFT added')
assert(afterUpdate.batches.some((b) => b.custodian === 'vanguard'), 'vanguard batch preserved')
assert(afterUpdate.batches.some((b) => b.custodian === 'schwab'), 'schwab batch preserved')
assert(afterUpdate.batches.some((b) => b.custodian === 'webull'), 'webull batch preserved')

console.log('All CSV import fixture validations passed.')
