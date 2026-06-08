import { useState } from 'react'
import {
  annualToMonthlyLimit,
  formatMonthlyAmount,
  formatMonthlyLimit,
  isCatchUpEligible,
  isOverSplitLimit,
  splitPairMonthlyTotal,
  totalCaContributionsMonthly,
  totalUsContributionsMonthly,
  us401kAnnualLimit,
  us401kMonthlyTotal,
  usHsaAnnualLimit,
  usIraAnnualLimit,
  usSepAnnualLimit,
  caRrspAnnualLimit,
  caTfsaAnnualLimit,
  type CaContributions,
  type OnboardingContributionsState,
  type UsContributions,
} from '../lib/onboardingContributions'
import {
  ContributionBoundedInput,
  ContributionPercentInput,
  ContributionsAccordion,
  ContributionSplitPair,
} from './onboarding/ContributionInputs'
import './WelcomeContributionsStepFields.scss'

type Props = {
  dateOfBirth: string
  region: 'us' | 'ca'
  contributions: OnboardingContributionsState
  onChange: (next: OnboardingContributionsState) => void
}

function UsContributionsPanel({
  us,
  catchUp,
  onChange,
  openAccordionId,
  onAccordionToggle,
}: {
  us: UsContributions
  catchUp: boolean
  onChange: (us: UsContributions) => void
  openAccordionId: string | null
  onAccordionToggle: (id: string) => void
}) {
  const k401Limit = annualToMonthlyLimit(us401kAnnualLimit(catchUp))
  const iraLimit = annualToMonthlyLimit(usIraAnnualLimit(catchUp))
  const sepLimit = annualToMonthlyLimit(usSepAnnualLimit())
  const hsaLimit = annualToMonthlyLimit(usHsaAnnualLimit())

  const k401Total = us401kMonthlyTotal(us.k401)
  const iraTotal = splitPairMonthlyTotal(us.ira)
  const sepTotal = splitPairMonthlyTotal(us.sep)

  return (
    <>
      <ContributionsAccordion
        id="contrib-us-401k"
        title="401k / 403b"
        subLabel={`${formatMonthlyAmount(k401Total)} · Limit ${formatMonthlyLimit(us401kAnnualLimit(catchUp))}`}
        open={openAccordionId === 'contrib-us-401k'}
        onToggle={() => onAccordionToggle('contrib-us-401k')}
      >
        <ContributionSplitPair
          idPrefix="contrib-us-401k"
          roth={us.k401.roth}
          traditional={us.k401.traditional}
          limitMonthly={k401Limit}
          onRothChange={(roth) =>
            onChange({ ...us, k401: { ...us.k401, roth } })
          }
          onTraditionalChange={(traditional) =>
            onChange({ ...us, k401: { ...us.k401, traditional } })
          }
        />
        <div className="contrib-employer-match">
          <div className="contrib-employer-match__row">
            <div className="contrib-employer-match__field">
              <span className="contrib-employer-match__label">Employer match</span>
              <ContributionPercentInput
                id="contrib-us-401k-match-pct"
                value={us.k401.employerMatchPct}
                onChange={(employerMatchPct) =>
                  onChange({ ...us, k401: { ...us.k401, employerMatchPct } })
                }
                ariaLabel="Employer match percentage"
              />
            </div>
            <span className="contrib-employer-match__up-to">up to</span>
            <div className="contrib-employer-match__field">
              <span className="contrib-employer-match__label">of salary</span>
              <ContributionPercentInput
                id="contrib-us-401k-match-cap"
                value={us.k401.employerMatchCapPct}
                onChange={(employerMatchCapPct) =>
                  onChange({ ...us, k401: { ...us.k401, employerMatchCapPct } })
                }
                ariaLabel="Employer match cap percentage of salary"
              />
            </div>
          </div>
        </div>
      </ContributionsAccordion>

      <ContributionsAccordion
        id="contrib-us-ira"
        title="IRA"
        subLabel={`${formatMonthlyAmount(iraTotal)} · Limit ${formatMonthlyLimit(usIraAnnualLimit(catchUp))}`}
        open={openAccordionId === 'contrib-us-ira'}
        onToggle={() => onAccordionToggle('contrib-us-ira')}
      >
        <ContributionSplitPair
          idPrefix="contrib-us-ira"
          roth={us.ira.roth}
          traditional={us.ira.traditional}
          limitMonthly={iraLimit}
          onRothChange={(roth) => onChange({ ...us, ira: { ...us.ira, roth } })}
          onTraditionalChange={(traditional) =>
            onChange({ ...us, ira: { ...us.ira, traditional } })
          }
        />
      </ContributionsAccordion>

      <ContributionsAccordion
        id="contrib-us-sep"
        title="SEP IRA"
        subLabel={`${formatMonthlyAmount(sepTotal)} · Limit ${formatMonthlyLimit(usSepAnnualLimit())}`}
        open={openAccordionId === 'contrib-us-sep'}
        onToggle={() => onAccordionToggle('contrib-us-sep')}
      >
        <ContributionSplitPair
          idPrefix="contrib-us-sep"
          roth={us.sep.roth}
          traditional={us.sep.traditional}
          limitMonthly={sepLimit}
          onRothChange={(roth) => onChange({ ...us, sep: { ...us.sep, roth } })}
          onTraditionalChange={(traditional) =>
            onChange({ ...us, sep: { ...us.sep, traditional } })
          }
        />
        <p className="contrib-note">
          SEP IRA limit is 25% of net self-employment income, up to $70,000/yr.
        </p>
      </ContributionsAccordion>

      <ContributionsAccordion
        id="contrib-us-hsa"
        title="HSA"
        subLabel={`${formatMonthlyAmount(us.hsa)} · Limit ${formatMonthlyLimit(usHsaAnnualLimit())}`}
        open={openAccordionId === 'contrib-us-hsa'}
        onToggle={() => onAccordionToggle('contrib-us-hsa')}
      >
        <ContributionBoundedInput
          id="contrib-us-hsa-amount"
          value={us.hsa}
          onChange={(hsa) => onChange({ ...us, hsa })}
          onMax={() => onChange({ ...us, hsa: hsaLimit })}
          ariaLabel="HSA monthly contribution"
        />
      </ContributionsAccordion>
    </>
  )
}

function CaContributionsPanel({
  ca,
  onChange,
  openAccordionId,
  onAccordionToggle,
}: {
  ca: CaContributions
  onChange: (ca: CaContributions) => void
  openAccordionId: string | null
  onAccordionToggle: (id: string) => void
}) {
  const rrspLimit = annualToMonthlyLimit(caRrspAnnualLimit())
  const tfsaLimit = annualToMonthlyLimit(caTfsaAnnualLimit())

  return (
    <>
      <ContributionsAccordion
        id="contrib-ca-rrsp"
        title="RRSP"
        subLabel={`${formatMonthlyAmount(ca.rrsp)} · Limit ${formatMonthlyLimit(caRrspAnnualLimit())}`}
        open={openAccordionId === 'contrib-ca-rrsp'}
        onToggle={() => onAccordionToggle('contrib-ca-rrsp')}
      >
        <ContributionBoundedInput
          id="contrib-ca-rrsp"
          value={ca.rrsp}
          onChange={(rrsp) => onChange({ ...ca, rrsp })}
          onMax={() => onChange({ ...ca, rrsp: rrspLimit })}
          ariaLabel="RRSP monthly contribution"
        />
        <div className="contrib-employer-match contrib-employer-match--ca">
          <div className="contrib-employer-match__field contrib-employer-match__field--single">
            <span className="contrib-employer-match__label">Employer pension contribution</span>
            <div className="contrib-employer-match__input-row">
              <ContributionPercentInput
                id="contrib-ca-pension-pct"
                value={ca.employerPensionPct}
                onChange={(employerPensionPct) =>
                  onChange({ ...ca, employerPensionPct })
                }
                ariaLabel="Employer pension contribution percentage of salary"
              />
              <span className="contrib-employer-match__text">of salary</span>
            </div>
          </div>
        </div>
        <p className="contrib-note">
          Your actual RRSP limit may be higher if you have unused contribution room from prior
          years.
        </p>
      </ContributionsAccordion>

      <ContributionsAccordion
        id="contrib-ca-tfsa"
        title="TFSA"
        subLabel={`${formatMonthlyAmount(ca.tfsa)} · Limit ${formatMonthlyLimit(caTfsaAnnualLimit())}`}
        open={openAccordionId === 'contrib-ca-tfsa'}
        onToggle={() => onAccordionToggle('contrib-ca-tfsa')}
      >
        <ContributionBoundedInput
          id="contrib-ca-tfsa"
          value={ca.tfsa}
          onChange={(tfsa) => onChange({ ...ca, tfsa })}
          onMax={() => onChange({ ...ca, tfsa: tfsaLimit })}
          ariaLabel="TFSA monthly contribution"
        />
        <p className="contrib-note">
          Unused TFSA room carries forward — your personal limit may be higher.
        </p>
      </ContributionsAccordion>

      <ContributionsAccordion
        id="contrib-ca-dpsp"
        title="Employer pension (DPSP)"
        subLabel={formatMonthlyAmount(ca.employerPension)}
        open={openAccordionId === 'contrib-ca-dpsp'}
        onToggle={() => onAccordionToggle('contrib-ca-dpsp')}
      >
        <ContributionBoundedInput
          id="contrib-ca-dpsp"
          value={ca.employerPension}
          onChange={(employerPension) => onChange({ ...ca, employerPension })}
          showMax={false}
          ariaLabel="Employer pension monthly amount"
        />
        <p className="contrib-note">
          If your employer contributes to a defined contribution pension or DPSP, enter the
          monthly amount here.
        </p>
      </ContributionsAccordion>
    </>
  )
}

export function WelcomeContributionsStepFields({
  dateOfBirth,
  region,
  contributions,
  onChange,
}: Props) {
  const catchUp = isCatchUpEligible(dateOfBirth)
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null)

  const handleAccordionToggle = (id: string) => {
    setOpenAccordionId((current) => (current === id ? null : id))
  }

  const handleUsChange = (us: UsContributions) => {
    onChange({ region: 'us', us })
  }

  const handleCaChange = (ca: CaContributions) => {
    onChange({ region: 'ca', ca })
  }

  return (
    <div className="welcome-contributions-step">
      <div className="welcome-contributions-step__card">
        <div className="welcome-contributions-step__card-header">Monthly contributions</div>
        <div className="welcome-contributions-step__accordions">
          {region === 'us' && contributions.region === 'us' ? (
            <UsContributionsPanel
              us={contributions.us}
              catchUp={catchUp}
              onChange={handleUsChange}
              openAccordionId={openAccordionId}
              onAccordionToggle={handleAccordionToggle}
            />
          ) : null}
          {region === 'ca' && contributions.region === 'ca' ? (
            <CaContributionsPanel
              ca={contributions.ca}
              onChange={handleCaChange}
              openAccordionId={openAccordionId}
              onAccordionToggle={handleAccordionToggle}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

export {
  totalUsContributionsMonthly,
  totalCaContributionsMonthly,
  isOverSplitLimit,
}
