import './OnboardingProgressSteps.scss'

const STEPS = ['profile', 'accounts', 'social-security', 'income-goal'] as const

type StepId = (typeof STEPS)[number]

type Props = {
  activeStep: StepId
  className?: string
}

export function OnboardingProgressSteps({ activeStep, className }: Props) {
  const activeIndex = STEPS.indexOf(activeStep)

  return (
    <div className={['onboarding-progress', className].filter(Boolean).join(' ')}>
      <p className="onboarding-progress__eyebrow">Setting up your plan</p>
      <div
        className="onboarding-progress__track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={activeIndex + 1}
        aria-label={`Step ${activeIndex + 1} of ${STEPS.length}`}
      >
        {STEPS.map((id, index) => {
          const isActive = index === activeIndex
          const isPast = index < activeIndex
          return (
            <span
              key={id}
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
