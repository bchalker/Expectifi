import { Switch } from '@heroui/react'
import { isValidIsoDateString } from '../lib/ageFromDob'
import type { CalculatorInputs, ComputedSnapshot } from '../lib/computeResults'
import {
  formatSsAgeLabel,
  normalizeClaimAge,
  spousalBenefitTripletFromUser,
  resolveUserEstimates,
  type SsClaimAge,
} from '../lib/socialSecurity'
import { fmtInput, fmtMon, parseNum } from '../utils/format'
import { ClaimAgeSegment } from './ClaimAgeSegment'
import { DateOfBirthSelects } from './DateOfBirthSelects'
import './ConfigSocialSecurityTab.scss'

const SSA_MY_ACCOUNT_URL = 'https://www.ssa.gov/myaccount/'

type Props = {
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
}

function SsAmountRow({
  dateOfBirth,
  claimAge,
  value,
  onChange,
}: {
  dateOfBirth: string
  claimAge: SsClaimAge
  value: number
  onChange: (n: number) => void
}) {
  const label = formatSsAgeLabel(dateOfBirth, claimAge)
  return (
    <label className="config-ss-amount-row">
      <span className="config-ss-amount-row__label">{label}</span>
      <span className="num-input-wrap config-ss-amount-row__input">
        <span className="num-input-prefix">$</span>
        <input
          type="text"
          inputMode="decimal"
          className="num-input"
          value={fmtInput(value)}
          onChange={(e) => onChange(Math.max(0, parseNum(e.target.value)))}
          placeholder="0"
        />
        <span className="config-ss-amount-row__suffix">/mo</span>
      </span>
    </label>
  )
}

export function ConfigSocialSecurityTab({ c, inputs, setInputs }: Props) {
  const dob = inputs.dateOfBirth
  const spouseDob = inputs.spouseDateOfBirth || ''
  const userEst = resolveUserEstimates(inputs)
  const spousalEst = spousalBenefitTripletFromUser(userEst)
  const breakdown = c.ssBreakdown
  const survivor = c.survivorCallout

  const spouseClaimAge = normalizeClaimAge(inputs.spouseClaimAge)

  const setUserBenefit = (age: SsClaimAge, amount: number) => {
    if (age === 62) setInputs({ ssBenefit62: amount })
    else if (age === 67) setInputs({ ssBenefit67: amount })
    else setInputs({ ssBenefit70: amount })
  }

  const setSpouseBenefit = (age: SsClaimAge, amount: number) => {
    if (age === 62) setInputs({ spouseBenefit62: amount })
    else if (age === 67) setInputs({ spouseBenefit67: amount })
    else setInputs({ spouseBenefit70: amount })
  }

  return (
    <div className="config-ss-tab">
      <p className="footnote footnote--muted config-drawer-lead">
        Enter monthly benefit estimates from your SSA account. Your claiming age is set on the Income dashboard when Social
        Security is included in expected monthly income.
      </p>

      {!isValidIsoDateString(dob) ? (
        <p className="config-ss-tab__warn">Set your date of birth on the Plan tab to show benefit ages and calendar years.</p>
      ) : null}

      <div className="config-ss-block">
        <div className="config-ss-block__title">Your estimates</div>
        <div className="config-ss-amounts">
          <SsAmountRow
            dateOfBirth={dob}
            claimAge={62}
            value={inputs.ssBenefit62}
            onChange={(n) => setUserBenefit(62, n)}
          />
          <SsAmountRow
            dateOfBirth={dob}
            claimAge={67}
            value={inputs.ssBenefit67}
            onChange={(n) => setUserBenefit(67, n)}
          />
          <SsAmountRow
            dateOfBirth={dob}
            claimAge={70}
            value={inputs.ssBenefit70}
            onChange={(n) => setUserBenefit(70, n)}
          />
        </div>
        <p className="config-ss-helper">
          <a href={SSA_MY_ACCOUNT_URL} target="_blank" rel="noopener noreferrer" className="config-ss-helper__link">
            Find these numbers at ssa.gov/myaccount →
          </a>
        </p>
        <p className="config-ss-note">
          These are today&apos;s estimates. SSA recalculates annually based on your earnings history.
        </p>
      </div>

      <div className="config-ss-block config-ss-block--married">
        <div className="config-ss-married-row">
          <span className="config-plan-label" id="config-ss-married-label">
            Are you married?
          </span>
          <Switch
            isSelected={inputs.married}
            onChange={(selected) => setInputs({ married: selected })}
            size="sm"
            aria-labelledby="config-ss-married-label"
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
          <span className="config-ss-married-state" aria-hidden>
            {inputs.married ? 'Yes' : 'No'}
          </span>
        </div>

        {inputs.married ? (
          <>
            <div className="config-ss-spousal-benefits">
              <div className="config-ss-married-row">
                <span className="config-plan-label" id="config-ss-spousal-benefits-label">
                  Will they receive spousal benefits?
                </span>
                <Switch
                  isSelected={!inputs.spouseHasOwnEarnings}
                  onChange={(selected) => setInputs({ spouseHasOwnEarnings: !selected })}
                  size="sm"
                  aria-labelledby="config-ss-spousal-benefits-label"
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
                <span className="config-ss-married-state" aria-hidden>
                  {!inputs.spouseHasOwnEarnings ? 'Yes' : 'No'}
                </span>
              </div>
              <p className="footnote footnote--muted config-ss-spousal-benefits__explain">
                Spousal benefits are monthly payments from Social Security to your spouse based on your work record (up
                to about half of your full retirement age benefit). They apply when your spouse does not get a higher
                benefit from their own earnings history.
              </p>
            </div>

            {!inputs.spouseHasOwnEarnings ? (
              <>
                <div className="config-plan-field config-ss-spouse-dob">
                  <span className="config-plan-label">Spouse date of birth</span>
                  <DateOfBirthSelects
                    value={spouseDob}
                    onChange={(iso) => setInputs({ spouseDateOfBirth: iso })}
                  />
                </div>
                <p className="config-ss-spousal-readonly">
                  Based on your benefit, your spouse qualifies for up to{' '}
                  <strong>{fmtMon(spousalEst.b67)}</strong> in spousal benefit at your full retirement age.
                </p>
              </>
            ) : (
              <>
                <div className="config-ss-amounts">
                  <SsAmountRow
                    dateOfBirth={spouseDob}
                    claimAge={62}
                    value={inputs.spouseBenefit62}
                    onChange={(n) => setSpouseBenefit(62, n)}
                  />
                  <SsAmountRow
                    dateOfBirth={spouseDob}
                    claimAge={67}
                    value={inputs.spouseBenefit67}
                    onChange={(n) => setSpouseBenefit(67, n)}
                  />
                  <SsAmountRow
                    dateOfBirth={spouseDob}
                    claimAge={70}
                    value={inputs.spouseBenefit70}
                    onChange={(n) => setSpouseBenefit(70, n)}
                  />
                </div>
                {breakdown?.spouseResolution?.comparisonNote ? (
                  <p className="config-ss-comparison">{breakdown.spouseResolution.comparisonNote}</p>
                ) : null}
              </>
            )}

            <div className="config-ss-claim-row">
              <span className="config-plan-label">Spouse claiming age</span>
              <ClaimAgeSegment
                value={spouseClaimAge}
                onChange={(age) => setInputs({ spouseClaimAge: age })}
                ariaLabel="Spouse Social Security claiming age"
              />
            </div>
          </>
        ) : null}
      </div>

      {survivor ? (
        <div className="config-ss-survivor" role="note">
          <p className="config-ss-survivor__text">
            If you pass first, your spouse&apos;s monthly income drops from{' '}
            <strong>{fmtMon(survivor.householdBothMonthly)}</strong> to{' '}
            <strong>{fmtMon(survivor.householdIfUserDiesFirst)}</strong>. Delaying your SS claim to age 70 would increase
            their survivor benefit to <strong>{fmtMon(survivor.survivorIfUserClaims70)}</strong>.
          </p>
        </div>
      ) : null}
    </div>
  )
}
