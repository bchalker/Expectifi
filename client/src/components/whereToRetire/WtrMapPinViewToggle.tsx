import { ModeButtonGroup } from '../ModeButton'
import type { MapPinColorView } from '../../lib/whereToRetire/mapPinDisplay'
import './WtrMapPinViewToggle.scss'

type Props = {
  value: MapPinColorView
  onChange: (view: MapPinColorView) => void
  className?: string
}

const OPTIONS = [
  { id: 'score' as const, label: 'Best Fit score' },
  { id: 'budget' as const, label: 'Lowest cost' },
  { id: 'expat' as const, label: 'Expat friendly' },
]

export function WtrMapPinViewToggle({ value, onChange, className }: Props) {
  return (
    <div
      className={['wtr-map-pin-view-toggle', className].filter(Boolean).join(' ')}
    >
      <ModeButtonGroup
        value={value}
        options={OPTIONS}
        onChange={onChange}
        ariaLabel="What matters most to you"
      />
    </div>
  )
}
