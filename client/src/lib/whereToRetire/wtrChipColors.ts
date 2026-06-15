import type { AppChipColor } from '../../components/ui/AppChip'

export function wtrTaxChipColor(tone: string): AppChipColor {
  if (tone === 'red') return 'danger'
  if (tone === 'amber') return 'warning'
  return 'success'
}

export function wtrIndexBandChipColor(band: string): AppChipColor {
  if (band === 'expensive' || band === 'below-average') return 'danger'
  if (band === 'moderate' || band === 'average') return 'warning'
  return 'success'
}
