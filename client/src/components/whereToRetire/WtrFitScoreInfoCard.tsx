import { ALL_CORE_KEYS, getFactorDefinition } from '../../utils/preferenceFactors'
import './WtrFitScoreInfoCard.scss'

type Props = {
  onOpenPreferences: () => void
}

export function WtrFitScoreInfoCard({ onOpenPreferences }: Props) {
  return (
    <aside className="wtr-fit-score-info" aria-labelledby="wtr-fit-score-info-title">
      <h3 id="wtr-fit-score-info-title" className="wtr-fit-score-info__title">
        How your Fit score works
      </h3>
      <p className="wtr-fit-score-info__body font-sm">
        Each destination&apos;s <strong>Fit</strong> score (<strong>0–100</strong>) blends cost of
        living, quality of life, affordability, healthcare, climate, and other factors — weighted by
        your Travel Priorities. Use{' '}
        <button
          type="button"
          className="wtr-fit-score-info__prefs-link"
          onClick={onOpenPreferences}
        >
          Update my preferences
        </button>{' '}
        above to adjust them.
      </p>
      <ul className="wtr-fit-score-info__factors" aria-label="Travel Priorities factors">
        {ALL_CORE_KEYS.map((key) => (
          <li key={key} className="wtr-fit-score-info__factor">
            {getFactorDefinition(key).label}
          </li>
        ))}
      </ul>
    </aside>
  )
}
