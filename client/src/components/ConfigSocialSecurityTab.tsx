import { useEffect, useMemo, useState } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import { pensionConfigForResidenceCountry } from '../lib/localePensionConfig'
import { openBankingLocaleFromCountry } from '../lib/openBankingRegion'
import {
  clampClaimAgeInRange,
  ssTripletFromMonthlyAt67,
} from '../lib/socialSecurity'
import { SocialSecuritySetupFields } from './SocialSecuritySetupFields'
import type { SpouseClaimMode } from './SpouseClaimModeSegment'

type Props = {
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
}

function hasSsBenefits(inputs: CalculatorInputs): boolean {
  return inputs.ssBenefit62 > 0 || inputs.ssBenefit67 > 0 || inputs.ssBenefit70 > 0
}

export function ConfigSocialSecurityTab({ inputs, setInputs }: Props) {
  const locale = openBankingLocaleFromCountry(inputs.residenceCountry ?? '') ?? 'us'
  const pension = useMemo(
    () => pensionConfigForResidenceCountry(inputs.residenceCountry ?? ''),
    [inputs.residenceCountry],
  )
  const [includeSs, setIncludeSs] = useState(() => hasSsBenefits(inputs))

  useEffect(() => {
    if (hasSsBenefits(inputs)) setIncludeSs(true)
  }, [inputs.ssBenefit62, inputs.ssBenefit67, inputs.ssBenefit70])

  const dob = inputs.dateOfBirth
  const ssAge = clampClaimAgeInRange(inputs.ssAge || pension.defaultClaimAge, pension.claimAgeMin, pension.claimAgeMax)
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

  const onIncludeSsChange = (value: boolean) => {
    setIncludeSs(value)
    if (!value) {
      setInputs({
        ssBenefit62: 0,
        ssBenefit67: 0,
        ssBenefit70: 0,
      })
    }
  }

  const onSsBenefitChange = (amount: number) => {
    const triplet = ssTripletFromMonthlyAt67(amount)
    setInputs({
      ssBenefit62: triplet.b62,
      ssBenefit67: triplet.b67,
      ssBenefit70: triplet.b70,
    })
  }

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
    <div className="config-ss-tab">
      <p className="footnote footnote--muted config-drawer-lead">
        {pension.stepSubtitle}
      </p>
      <SocialSecuritySetupFields
        locale={locale}
        includeSs={includeSs}
        onIncludeSsChange={onIncludeSsChange}
        ssAge={ssAge}
        onSsAgeChange={(age) => setInputs({ ssAge: age })}
        ssBenefitMonthly={ssBenefitMonthly}
        onSsBenefitMonthlyChange={onSsBenefitChange}
        dateOfBirth={dob}
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
      />
    </div>
  )
}
