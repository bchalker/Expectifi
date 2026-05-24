import { IconArrowRight } from '@tabler/icons-react'
import {
  detectBrowserOnboardingRegion,
  findOnboardingRegion,
  ONBOARDING_COUNTRY_GRID,
  type OnboardingRegionId,
} from '../lib/onboardingRegions'
import './OnboardingRegionStep.scss'

type Props = {
  onSelect: (regionId: OnboardingRegionId) => void
  className?: string
}

function RegionFlag({ flag }: { flag: string }) {
  return (
    <span className="onboarding-region-step__flag" aria-hidden>
      {flag}
    </span>
  )
}

export function OnboardingRegionStep({ onSelect, className }: Props) {
  const detected = detectBrowserOnboardingRegion()
  const detectedRegion = detected ? findOnboardingRegion(detected) : undefined

  return (
    <div className={['onboarding-region-step', className].filter(Boolean).join(' ')}>
      <h2 id="onboarding-region-title" className="onboarding-region-step__heading">
        Where are you based?
      </h2>

      {detectedRegion ? (
        <>
          <div className="onboarding-region-step__detected-row">
            <RegionFlag flag={detectedRegion.flag} />
            <span className="onboarding-region-step__detected-label">
              {detectedRegion.label} detected
            </span>
            <button
              type="button"
              className="onboarding-region-step__detected-continue"
              onClick={() => onSelect(detectedRegion.id)}
            >
              Continue
              <IconArrowRight size={16} stroke={2} aria-hidden />
            </button>
          </div>
          <div className="onboarding-region-step__divider" role="presentation" />
        </>
      ) : null}

      <p className="onboarding-region-step__hint">
        {detectedRegion ? 'Not right? Pick your country below.' : 'Pick your country below.'}
      </p>

      <ul className="onboarding-region-step__grid">
        {ONBOARDING_COUNTRY_GRID.map((region) => (
          <li key={region.id}>
            <button
              type="button"
              className={[
                'onboarding-region-step__cell',
                detected === region.id && 'onboarding-region-step__cell--suggested',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(region.id)}
            >
              <RegionFlag flag={region.flag} />
              <span className="onboarding-region-step__cell-label">{region.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
