import { PanelThumbSlider } from '../ui/PanelThumbSlider'
import './WtrMinRetirementScoreSlider.scss'
import './WtrFilterPriorityCrossRef.scss'

const SLIDER_MAX = 100

/** Visual reference marks on the track (not snap points). */
const SCORE_HASH_MARKS = [55, 70, 85] as const

type Props = {
  value: number
  onChange: (value: number) => void
}

function formatThumbValue(value: number): string {
  if (value <= 0) return 'Any'
  return String(value)
}

export function WtrMinRetirementScoreSlider({ value, onChange }: Props) {
  return (
    <div className="wtr-filter-score-slider">
      <PanelThumbSlider
        className="wtr-filter-score-slider__panel"
        value={value}
        onChange={onChange}
        min={0}
        max={SLIDER_MAX}
        label="Min"
        ticks={[...SCORE_HASH_MARKS]}
        formatThumbValue={formatThumbValue}
        aria-label="Minimum retirement score"
      />
    </div>
  )
}
