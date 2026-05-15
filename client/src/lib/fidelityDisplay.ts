/**
 * Fidelity exports often use ALL CAPS for security descriptions.
 * Normalize to sentence-friendly casing for UI (CSV value unchanged).
 */
export function formatFidelityDescription(raw: string): string {
  const t = raw.trim()
  if (!t) return t
  const letters = t.replace(/[^A-Za-z]/g, '')
  if (!letters.length) return t
  if (letters !== letters.toUpperCase()) return t

  let out = t
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bEtf\b/g, 'ETF')
    .replace(/\bReit\b/g, 'REIT')
    .replace(/\bUsa\b/g, 'USA')
    .replace(/\bLlc\b/g, 'LLC')
    .replace(/\bLp\b/g, 'LP')
    .replace(/\bIra\b/g, 'IRA')
    .replace(/\bHsa\b/g, 'HSA')
    .replace(/\bInc\b/g, 'Inc.')
  return out
}
