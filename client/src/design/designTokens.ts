/** Keys match CSS custom properties on `:root` (include `--` prefix). */
export const DESIGN_TOKEN_META: { key: `--${string}`; label: string }[] = [
  { key: '--ds-font-body', label: 'Font · body' },
  { key: '--ds-font-mono', label: 'Font · mono / labels' },
  { key: '--ds-color-bg', label: 'Color · page background' },
  { key: '--ds-color-surface', label: 'Color · surface' },
  { key: '--ds-color-surface2', label: 'Color · surface muted' },
  { key: '--ds-color-text', label: 'Color · text' },
  { key: '--ds-color-text-muted', label: 'Color · text muted' },
  { key: '--ds-color-text-faint', label: 'Color · text faint' },
  { key: '--ds-color-accent', label: 'Color · primary (teal)' },
  { key: '--ds-color-accent-text', label: 'Color · accent text' },
  { key: '--ds-color-accent-light', label: 'Color · teal tint bg' },
  { key: '--ds-color-strip-drawer', label: 'Color · amber accent' },
  { key: '--ds-color-strip-drawer-strong', label: 'Color · amber hover' },
  { key: '--ds-color-strip-drawer-light', label: 'Color · amber tint bg' },
  { key: '--ds-color-strip-drawer-border', label: 'Color · amber border' },
  { key: '--ds-color-strip-drawer-text', label: 'Color · amber on light' },
  { key: '--ds-color-danger', label: 'Color · danger' },
]

export const DEFAULT_DESIGN_TOKENS: Record<string, string> = {
  '--ds-font-body': "'Nunito', system-ui, -apple-system, sans-serif",
  '--ds-font-mono': "'Nunito', system-ui, -apple-system, sans-serif",
  '--ds-color-bg': '#F4F6F7',
  '--ds-color-surface': '#ffffff',
  '--ds-color-surface2': '#E8EDF2',
  '--ds-color-text': '#1C2B3A',
  '--ds-color-text-muted': '#5F5E5A',
  '--ds-color-text-faint': '#888780',
  '--ds-color-accent': '#0F6E56',
  '--ds-color-accent-text': '#0B5344',
  '--ds-color-accent-light': '#E1F5EE',
  '--ds-color-strip-drawer': '#EF9F27',
  '--ds-color-strip-drawer-strong': '#BA7517',
  '--ds-color-strip-drawer-light': '#FAEEDA',
  '--ds-color-strip-drawer-border': 'rgba(239, 159, 39, 0.42)',
  '--ds-color-strip-drawer-text': '#6B5410',
  '--ds-color-danger': '#A32D2D',
}

export const DESIGN_STORAGE_KEY = 'retirement-calc-design-tokens'
