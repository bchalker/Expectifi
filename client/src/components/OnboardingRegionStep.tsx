import { useEffect, useRef } from 'react'
import {
  detectBrowserOnboardingRegion,
  normalizeOnboardingRegionId,
  ONBOARDING_COUNTRY_GRID,
  type OnboardingRegionId,
} from '../lib/onboardingRegions'
import './OnboardingRegionStep.scss'

type Props = {
  onSelect: (regionId: OnboardingRegionId) => void
  /** When set, highlights the chosen country (profile step). */
  selectedRegionId?: OnboardingRegionId | null
  /** Hide standalone title/intro — use inside "Let's start with you". */
  embedded?: boolean
  className?: string
}

function RegionFlag({ flag }: { flag: string }) {
  return (
    <span className="onboarding-region-step__flag" aria-hidden>
      {flag}
    </span>
  )
}

export function OnboardingRegionStep({
  onSelect,
  selectedRegionId = null,
  embedded = false,
  className,
}: Props) {
  const detected = detectBrowserOnboardingRegion()
  const selected = normalizeOnboardingRegionId(selectedRegionId ?? undefined)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (selected) return
    if (!detected) return
    onSelectRef.current(detected)
  }, [selected, detected])

  return (
    <div
      className={[
        'onboarding-region-step',
        embedded && 'onboarding-region-step--embedded',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!embedded ? (
        <>
          <h2 id="onboarding-region-title" className="onboarding-region-step__heading">
            Where are you based?
          </h2>
          <p className="onboarding-region-step__intro">
            Expectifi is built for savers in the United States and Canada.
          </p>
        </>
      ) : null}

      <ul className="onboarding-region-step__grid">
        {ONBOARDING_COUNTRY_GRID.map((region) => {
          const isSelected = selected === region.id
          const isDetected = !selected && detected === region.id
          return (
            <li key={region.id}>
              <button
                type="button"
                className={[
                  'onboarding-region-step__cell',
                  isSelected && 'onboarding-region-step__cell--selected',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelect(region.id)}
                aria-pressed={isSelected}
              >
                <span className="onboarding-region-step__cell-main">
                  <RegionFlag flag={region.flag} />
                  <span className="onboarding-region-step__cell-copy">
                    <span className="onboarding-region-step__cell-label">{region.label}</span>
                    {isDetected ? (
                      <span className="onboarding-region-step__cell-detected">Detected</span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
