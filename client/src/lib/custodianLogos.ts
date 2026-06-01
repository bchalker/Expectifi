import type { PositionsCsvCustodian } from './positionsCsvImport'

function publicBase(): string {
  const b = import.meta.env.BASE_URL ?? '/'
  return b.endsWith('/') ? b.slice(0, -1) : b
}

/** Served from `public/custodians/{id}.(png|svg)`. Returns null when no asset exists. */
export function custodianLogoPublicUrl(id: PositionsCsvCustodian | undefined | null): string | null {
  const c = id ?? 'fidelity'
  if (c === 'other' || c === 'webull') return null
  const prefix = publicBase()
  const ext = c === 'fidelity' || c === 'schwab' || c === 'vanguard' ? 'png' : 'svg'
  return `${prefix}/custodians/${c}.${ext}`
}
