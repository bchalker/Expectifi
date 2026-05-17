import { useState } from 'react'
import { IconArrowRight } from '@tabler/icons-react'
import {
  DEFAULT_PREFERENCES,
  savePreferences,
  type WtrPreferences,
} from '../../lib/whereToRetire/preferences'
import { PreferenceQuestions } from './PreferenceQuestions'
import './PreferenceQuestions.scss'
import './PreferenceOverlay.scss'

type Props = {
  onComplete: (prefs: WtrPreferences) => void
  onSkip: (prefs: WtrPreferences) => void
}

export function PreferenceOverlay({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [draft, setDraft] = useState(() => ({
    regionScope: DEFAULT_PREFERENCES.regionScope,
    priorities: [] as WtrPreferences['priorities'],
    dealbreakers: [] as WtrPreferences['dealbreakers'],
  }))

  const finish = (skipped: boolean) => {
    const prefs: WtrPreferences = {
      completed: true,
      skipped,
      regionScope: draft.regionScope,
      priorities: draft.priorities,
      dealbreakers: draft.dealbreakers.filter((d) => d !== 'none'),
    }
    savePreferences(prefs)
    if (skipped) onSkip(prefs)
    else onComplete(prefs)
  }

  return (
    <div className="wtr-overlay" role="dialog" aria-modal="true" aria-labelledby="wtr-overlay-title">
      <div className="wtr-overlay__card">
        <div className="wtr-overlay__progress" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`wtr-overlay__progress-dot${n <= step ? ' wtr-overlay__progress-dot--active' : ''}${n < step ? ' wtr-overlay__progress-dot--done' : ''}`}
            />
          ))}
        </div>

        <button type="button" className="wtr-overlay__skip" onClick={() => finish(true)}>
          Skip for now
        </button>

        <h2 id="wtr-overlay-title" className="wtr-overlay__title">
          {step === 1 && 'Where to Retire'}
          {step === 2 && 'What matters most?'}
          {step === 3 && 'Any dealbreakers?'}
        </h2>

        <PreferenceQuestions draft={draft} onChange={setDraft} step={step} />

        <div className="wtr-overlay__actions">
          {step > 1 ? (
            <button
              type="button"
              className="wtr-overlay__btn wtr-overlay__btn--ghost"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <button
              type="button"
              className="wtr-overlay__btn wtr-overlay__btn--primary"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
            >
              Continue
              <IconArrowRight size={18} stroke={1.5} aria-hidden />
            </button>
          ) : (
            <button type="button" className="wtr-overlay__btn wtr-overlay__btn--primary" onClick={() => finish(false)}>
              See recommendations
              <IconArrowRight size={18} stroke={1.5} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
