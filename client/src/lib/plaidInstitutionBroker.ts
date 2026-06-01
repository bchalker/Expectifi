import type { PlaidItemSummary } from './api/plaid'
import type { BrokerSource } from './brokerMonogram'
import { custodianToBrokerSource } from './brokerMonogram'
import type { PositionsCsvCustodian } from './positionsCsvImport'

export type KnownBrokerSource = Exclude<BrokerSource, 'plaid' | 'manual' | 'other'>

const BROKER_LABEL: Record<KnownBrokerSource, string> = {
  fidelity: 'Fidelity',
  schwab: 'Schwab',
  vanguard: 'Vanguard',
  webull: 'Webull',
}

/** Human label for conflict modals and prompts. */
export function brokerDisplayLabel(source: KnownBrokerSource): string {
  return BROKER_LABEL[source]
}

/** Map Plaid institution metadata to a known CSV broker source when possible. */
export function institutionToBrokerSource(
  institutionId: string | null | undefined,
  institutionName: string | null | undefined,
): KnownBrokerSource | null {
  const hay = `${institutionName ?? ''} ${institutionId ?? ''}`.toLowerCase()
  if (hay.includes('fidelity')) return 'fidelity'
  if (hay.includes('schwab') || hay.includes('charles schwab')) return 'schwab'
  if (hay.includes('vanguard')) return 'vanguard'
  if (hay.includes('webull')) return 'webull'
  return null
}

export function brokerSourceFromPlaidItem(item: PlaidItemSummary): KnownBrokerSource | null {
  return institutionToBrokerSource(item.institutionId, item.institutionName)
}

/** Brokers currently linked via Plaid (healthy items only). */
export function plaidConnectedBrokers(items: PlaidItemSummary[]): Set<KnownBrokerSource> {
  const out = new Set<KnownBrokerSource>()
  for (const item of items) {
    if (item.status !== 'healthy') continue
    const broker = brokerSourceFromPlaidItem(item)
    if (broker) out.add(broker)
  }
  return out
}

export function custodianHasPlaidConnection(
  custodian: PositionsCsvCustodian,
  items: PlaidItemSummary[],
): boolean {
  if (custodian === 'other') return false
  const broker = custodianToBrokerSource(custodian)
  if (broker === 'other') return false
  return plaidConnectedBrokers(items).has(broker)
}
