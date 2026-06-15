import './OnboardingProgressSteps.scss'

type Props = {
  /** 0-based index of the active step */
  activeIndex: number
  totalSteps: number
  className?: string
  ariaLabel?: string
}

export function OnboardingProgressSteps({
  activeIndex,
  totalSteps,
  className,
  ariaLabel,
}: Props) {
  const clampedIndex = Math.max(0, Math.min(totalSteps - 1, activeIndex))

  return (
    <div className={['onboarding-progress', className].filter(Boolean).join(' ')}>
      <div
        className="onboarding-progress__track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={clampedIndex + 1}
        aria-label={ariaLabel ?? `Step ${clampedIndex + 1} of ${totalSteps}`}
      >
        {Array.from({ length: totalSteps }, (_, index) => {
          const isActive = index === clampedIndex
          const isPast = index < clampedIndex
          return (
            <span
              key={index}
              className={[
                'onboarding-progress__dot',
                isActive && 'onboarding-progress__dot--active',
                isPast && 'onboarding-progress__dot--past',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden
            />
          )
        })}
      </div>
    </div>
  )
}
