/**
 * Run TrueLayer account fetch + snapshot build for a user (dev).
 * Usage: npm run test:truelayer-sync -w server -- bchalker@gmail.com
 */
import { config } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dbQuery } from '../dbQuery.js'
import { ensureSchema } from '../db.js'
import {
  fetchAndStoreTrueLayerSnapshot,
  loadTrueLayerConnection,
} from '../truelayerData.js'
import { isTrueLayerConfigured, logTrueLayerConfigAtStartup } from '../truelayerConfig.js'

config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') })

const email = (process.argv[2] ?? '').trim().toLowerCase()
if (!email) {
  console.error('Usage: npm run test:truelayer-sync -w server -- <email>')
  process.exit(1)
}

await ensureSchema()
logTrueLayerConfigAtStartup()

if (!isTrueLayerConfigured()) {
  console.error('TrueLayer is not configured in server/.env')
  process.exit(1)
}

const { rows } = await dbQuery<{ id: string; email: string }>(
  'SELECT id, email FROM users WHERE LOWER(email) = ? LIMIT 1',
  [email],
)
const user = rows[0]
if (!user) {
  console.error(`No user found for ${email}`)
  process.exit(1)
}

const connection = await loadTrueLayerConnection(user.id)
if (!connection) {
  console.error(`No TrueLayer connection for ${email}. Connect bank in the app first (UK/EU region).`)
  process.exit(1)
}

console.log(`Syncing TrueLayer for ${user.email} (connection ${connection.id})…`)
const { snapshot, fetchFailed } = await fetchAndStoreTrueLayerSnapshot(user.id)
if (fetchFailed) {
  console.warn('Live fetch had issues; snapshot may be from last stored rows.')
}
if (!snapshot) {
  console.error('Sync produced no snapshot (no accounts or token error).')
  process.exit(1)
}

const b = snapshot.balances
console.log('OK — snapshot balances:')
console.log(
  JSON.stringify(
    {
      institution: snapshot.institutionName,
      base401k: b.base401k,
      baseSE401k: b.baseSE401k,
      baseTradIRA: b.baseTradIRA,
      baseRoth: b.baseRoth,
      baseHsa: b.baseHsa,
      brkBal: b.brkBal,
      positionRows: snapshot.rows.length,
    },
    null,
    2,
  ),
)
