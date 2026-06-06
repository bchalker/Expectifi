import { useMemo } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import { OAS_CONFIG, pensionConfigForResidenceCountry } from '../lib/localePensionConfig'
import { openBankingLocaleFromCountry } from '../lib/openBankingRegion'
import {
  clampClaimAgeInRange,
  ssTripletFromMonthlyAt67,
} from '../lib/socialSecurity'
import {
  isCanadaResidence,
  partitionGuaranteedIncomeEntries,
  guaranteedIncomeEntriesFromInputs,
  type GuaranteedIncomeEntry,
} from '../lib/guaranteedIncome'
import { SocialSecuritySetupFields } from './SocialSecuritySetupFields'
import { ClaimAgeSlider } from './ClaimAgeSlider'
import { CurrencyAmountInput } from './ui/CurrencyAmountInput'
import type { SpouseClaimMode } from './SpouseClaimModeSegment'
import './GuaranteedIncomeSetupPanel.scss'
import './SocialSecuritySetupFields.scss'
import './ClaimAgeSlider.scss'
import './ui/CurrencyAmountInput.scss'
import './OnboardingFieldShell.scss'

type Props = {
  inputs: CalculatorInputs
  setInputs: (patch: Partial<CalculatorInputs>) => void
  userBenefitError?: string
  onUpdateEntry: (id: string, patch: Partial<GuaranteedIncomeEntry>) => void
  onPrimaryBenefitChange: (monthlyAt67: number) => void
  onPrimaryAgeChange: (age: number) => void
}

function UsSocialSecuritySection({
  entry,
  inputs,
  setInputs,
  country,
  userBenefitError,
  onPrimaryBenefitChange,
  onPrimaryAgeChange,
}: {
  entry: GuaranteedIncomeEntry
  inputs: CalculatorInputs
  setInputs: (patch: Partial<CalculatorInputs>) => void
  country: string
  userBenefitError?: string
  onPrimaryBenefitChange: (monthlyAt67: number) => void
  onPrimaryAgeChange: (age: number) => void
}) {
  const locale = openBankingLocaleFromCountry(country) ?? 'us'
  const pension = useMemo(() => pensionConfigForResidenceCountry(country), [country])
  const ssAge = clampClaimAgeInRange(entry.startAge || pension.defaultClaimAge, pension.claimAgeMin, pension.claimAgeMax)
  const ssBenefitMonthly = inputs.ssBenefit67 > 0 ? inputs.ssBenefit67 : 0
  const includeSpouse = inputs.married
  const spouseClaimMode: SpouseClaimMode = inputs.spouseHasOwnEarnings === false ? 'spousal' : 'own'
  const spouseDob = inputs.spouseDateOfBirth || ''
  const spouseSsAge = clampClaimAgeInRange(
    inputs.spouseClaimAge || pension.defaultClaimAge,
    pension.claimAgeMin,
    pension.claimAgeMax,
  )
  const spouseBenefitMonthly = inputs.spouseBenefit67 > 0 ? inputs.spouseBenefit67 : 0

  const onIncludeSpouseChange = (value: boolean) => {
    if (!value) {
      setInputs({
        married: false,
        spouseDateOfBirth: '',
        spouseBenefit62: 0,
        spouseBenefit67: 0,
        spouseBenefit70: 0,
      })
      return
    }
    setInputs({ married: true })
  }

  const onSpouseClaimModeChange = (mode: SpouseClaimMode) => {
    const spouseHasOwnEarnings = mode === 'own'
    if (!spouseHasOwnEarnings) {
      setInputs({
        spouseHasOwnEarnings: false,
        spouseBenefit62: 0,
        spouseBenefit67: 0,
        spouseBenefit70: 0,
      })
      return
    }
    setInputs({ spouseHasOwnEarnings: true })
  }

  const onSpouseBenefitChange = (amount: number) => {
    const triplet = ssTripletFromMonthlyAt67(amount)
    setInputs({
      spouseBenefit62: triplet.b62,
      spouseBenefit67: triplet.b67,
      spouseBenefit70: triplet.b70,
    })
  }

  return (
    <SocialSecuritySetupFields
      locale={locale}
      userBenefitError={userBenefitError}
      dateOfBirth={inputs.dateOfBirth || ''}
      ssAge={ssAge}
      onSsAgeChange={onPrimaryAgeChange}
      ssBenefitMonthly={ssBenefitMonthly}
      onSsBenefitMonthlyChange={onPrimaryBenefitChange}
      includeSpouse={includeSpouse}
      onIncludeSpouseChange={onIncludeSpouseChange}
      spouseClaimMode={spouseClaimMode}
      onSpouseClaimModeChange={onSpouseClaimModeChange}
      spouseDob={spouseDob}
      onSpouseDobChange={(iso) => setInputs({ spouseDateOfBirth: iso })}
      spouseSsAge={spouseSsAge}
      onSpouseSsAgeChange={(age) => setInputs({ spouseClaimAge: age })}
      spouseBenefitMonthly={spouseBenefitMonthly}
      onSpouseBenefitMonthlyChange={onSpouseBenefitChange}
      hints={{ benefitHintLinkUrl: pension.benefitHintLinkUrl }}
    />
  )
}

function CanadaCppOasSection({
  cppEntry,
  oasEntry,
  inputs,
  setInputs,
  country,
  userBenefitError,
  onPrimaryBenefitChange,
  onPrimaryAgeChange,
  onUpdateEntry,
}: {
  cppEntry: GuaranteedIncomeEntry
  oasEntry: GuaranteedIncomeEntry
  inputs: CalculatorInputs
  setInputs: (patch: Partial<CalculatorInputs>) => void
  country: string
  userBenefitError?: string
  onPrimaryBenefitChange: (monthlyAt67: number) => void
  onPrimaryAgeChange: (age: number) => void
  onUpdateEntry: (id: string, patch: Partial<GuaranteedIncomeEntry>) => void
}) {
  const locale = openBankingLocaleFromCountry(country) ?? 'ca'
  const pension = useMemo(() => pensionConfigForResidenceCountry(country), [country])
  const ssAge = clampClaimAgeInRange(
    cppEntry.startAge || pension.defaultClaimAge,
    pension.claimAgeMin,
    pension.claimAgeMax,
  )
  const ssBenefitMonthly = inputs.ssBenefit67 > 0 ? inputs.ssBenefit67 : 0
  const includeSpouse = inputs.married
  const spouseClaimMode: SpouseClaimMode = inputs.spouseHasOwnEarnings === false ? 'spousal' : 'own'
  const spouseDob = inputs.spouseDateOfBirth || ''
  const spouseSsAge = clampClaimAgeInRange(
    inputs.spouseClaimAge || pension.defaultClaimAge,
    pension.claimAgeMin,
    pension.claimAgeMax,
  )
  const spouseBenefitMonthly = inputs.spouseBenefit67 > 0 ? inputs.spouseBenefit67 : 0

  const onIncludeSpouseChange = (value: boolean) => {
    if (!value) {
      setInputs({
        married: false,
        spouseDateOfBirth: '',
        spouseBenefit62: 0,
        spouseBenefit67: 0,
        spouseBenefit70: 0,
      })
      return
    }
    setInputs({ married: true })
  }

  const onSpouseClaimModeChange = (mode: SpouseClaimMode) => {
    const spouseHasOwnEarnings = mode === 'own'
    if (!spouseHasOwnEarnings) {
      setInputs({
        spouseHasOwnEarnings: false,
        spouseBenefit62: 0,
        spouseBenefit67: 0,
        spouseBenefit70: 0,
      })
      return
    }
    setInputs({ spouseHasOwnEarnings: true })
  }

  const onSpouseBenefitChange = (amount: number) => {
    const triplet = ssTripletFromMonthlyAt67(amount)
    setInputs({
      spouseBenefit62: triplet.b62,
      spouseBenefit67: triplet.b67,
      spouseBenefit70: triplet.b70,
    })
  }

  const oasRange = { min: OAS_CONFIG.startAgeMin, max: OAS_CONFIG.startAgeMax }

  return (
    <div className="guaranteed-income-government guaranteed-income-government--ca">
      <section className="guaranteed-income-government__section">
        <h3 className="guaranteed-income-government__section-title">CPP</h3>
        <SocialSecuritySetupFields
          locale={locale}
          userBenefitError={userBenefitError}
          dateOfBirth={inputs.dateOfBirth || ''}
          ssAge={ssAge}
          onSsAgeChange={onPrimaryAgeChange}
          ssBenefitMonthly={ssBenefitMonthly}
          onSsBenefitMonthlyChange={onPrimaryBenefitChange}
          includeSpouse={includeSpouse}
          onIncludeSpouseChange={onIncludeSpouseChange}
          spouseClaimMode={spouseClaimMode}
          onSpouseClaimModeChange={onSpouseClaimModeChange}
          spouseDob={spouseDob}
          onSpouseDobChange={(iso) => setInputs({ spouseDateOfBirth: iso })}
          spouseSsAge={spouseSsAge}
          onSpouseSsAgeChange={(age) => setInputs({ spouseClaimAge: age })}
          spouseBenefitMonthly={spouseBenefitMonthly}
          onSpouseBenefitMonthlyChange={onSpouseBenefitChange}
          claimAgeMilestoneTicks={[60, 65, 70]}
          hints={{
            benefitFieldLabel: 'Estimated monthly CPP benefit',
            benefitHint: pension.benefitHint,
            benefitHintLinkUrl: pension.benefitHintLinkUrl,
            claimAgeHint: pension.claimAgeHint,
            includeSpouseToggleLabel: "Include my spouse's CPP",
            benefitHintLinkLabel: 'Service Canada',
          }}
        />
      </section>

      <section className="guaranteed-income-government__section guaranteed-income-government__section--oas">
        <h3 className="guaranteed-income-government__section-title">OAS</h3>
        <div className="guaranteed-income-entry__oas-grid">
          <div className="config-plan-field">
            <span className="config-plan-label">OAS start age</span>
            <ClaimAgeSlider
              value={oasEntry.startAge}
              onChange={(age) => onUpdateEntry(oasEntry.id, { startAge: age })}
              ariaLabel="OAS start age"
              claimAgeMin={oasRange.min}
              claimAgeMax={oasRange.max}
              milestoneAges={[65, 67, 70]}
            />
            <p className="ss-setup-fields__hint">{OAS_CONFIG.startAgeHint}</p>
          </div>
          <CurrencyAmountInput
            id={`gi-oas-${oasEntry.id}`}
            label={OAS_CONFIG.benefitLabel}
            value={oasEntry.monthlyAmount}
            onChange={(amount) => onUpdateEntry(oasEntry.id, { monthlyAmount: amount })}
            hint={OAS_CONFIG.benefitHint}
            externalPrefix
          />
        </div>
        <p className="guaranteed-income-entry__note">{OAS_CONFIG.clawbackNote}</p>
      </section>
    </div>
  )
}

export function GuaranteedIncomeGovernmentSection({
  inputs,
  setInputs,
  userBenefitError,
  onUpdateEntry,
  onPrimaryBenefitChange,
  onPrimaryAgeChange,
}: Props) {
  const country = inputs.residenceCountry ?? ''
  const entries = useMemo(() => guaranteedIncomeEntriesFromInputs(inputs), [inputs])
  const { government } = partitionGuaranteedIncomeEntries(entries, country)

  if (isCanadaResidence(country)) {
    const cppEntry = government.find((e) => e.type === 'cpp')
    const oasEntry = government.find((e) => e.type === 'oas')
    if (!cppEntry || !oasEntry) return null

    return (
      <CanadaCppOasSection
        cppEntry={cppEntry}
        oasEntry={oasEntry}
        inputs={inputs}
        setInputs={setInputs}
        country={country}
        userBenefitError={userBenefitError}
        onPrimaryBenefitChange={onPrimaryBenefitChange}
        onPrimaryAgeChange={onPrimaryAgeChange}
        onUpdateEntry={onUpdateEntry}
      />
    )
  }

  const ssEntry = government.find((e) => e.type === 'ss')
  if (!ssEntry) return null

  return (
    <UsSocialSecuritySection
      entry={ssEntry}
      inputs={inputs}
      setInputs={setInputs}
      country={country}
      userBenefitError={userBenefitError}
      onPrimaryBenefitChange={onPrimaryBenefitChange}
      onPrimaryAgeChange={onPrimaryAgeChange}
    />
  )
}
