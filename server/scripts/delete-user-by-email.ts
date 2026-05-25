/**
 * Permanently delete a user by email (same purge as Cancel account).
 * Usage: npm run delete-user -w server -- bchalker@gmail.com
 */
import { config } from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureSchema } from '../db.js'
import { deleteUserAccountByEmail } from '../deleteUserAccount.js'

const root = dirname(fileURLToPath(import.meta.url))
config({ path: join(root, '..', '.env') })

const email = process.argv[2]?.trim()
if (!email) {
  console.error('Usage: npm run delete-user -w server -- <email>')
  process.exit(1)
}

await ensureSchema()
const deleted = await deleteUserAccountByEmail(email)
if (!deleted) {
  console.error(`No user found for ${email}`)
  process.exit(1)
}
console.log(`Deleted user and all associated data for ${email}`)
