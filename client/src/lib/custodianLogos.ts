import type { PositionsCsvCustodian } from './positionsCsvImport'

function publicBase(): string {
  const b = import.meta.env.BASE_URL ?? '/'
  return b.endsWith('/') ? b.slice(0, -1) : b
}

/** Served from `public/custodians/{id}.svg`. Returns null for "other" (use icon). */
export function custodianLogoPublicUrl(id: PositionsCsvCustodian | undefined | null): string | null {
  const c = id ?? 'fidelity'
  if (c === 'other') return null
  const prefix = publicBase()
  return `${prefix}/custodians/${c}.svg`
}
