/** Dividend yield preset (y = yield %, g = NAV drift %). */
export type IncomeYieldPreset = {
  id: string
  label: string
  y: number
  g: number
}

export const DEFAULT_INCOME_PRESETS: IncomeYieldPreset[] = [
  { id: 'p1', y: 6, g: 1, label: 'JEPI/JEPQ · 6% / +1%' },
  { id: 'p2', y: 9, g: -2, label: 'BDC (ARCC) · 9% / −2%' },
  { id: 'p3', y: 6, g: 4, label: 'CEF hybrid · 6% / +4%' },
  { id: 'p4', y: 12, g: -8, label: 'YieldMax · 12% / −8%' },
  { id: 'p5', y: 5, g: 3, label: 'Div growth · 5% / +3%' },
]

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

/** Coerce saved or partial data into a usable preset list. */
export function normalizeIncomePresets(raw: unknown): IncomeYieldPreset[] {
  if (!Array.isArray(raw) || raw.length === 0) return [...DEFAULT_INCOME_PRESETS]
  const out: IncomeYieldPreset[] = []
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `p-${out.length}`
    const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim() : 'Preset'
    const yNum = typeof o.y === 'number' ? o.y : Number(o.y)
    const gNum = typeof o.g === 'number' ? o.g : Number(o.g)
    const y = Number.isFinite(yNum) ? clamp(yNum, 2, 20) : 6
    const g = Number.isFinite(gNum) ? clamp(gNum, -10, 10) : 0
    out.push({ id, label, y, g })
  }
  return out.length > 0 ? out : [...DEFAULT_INCOME_PRESETS]
}
