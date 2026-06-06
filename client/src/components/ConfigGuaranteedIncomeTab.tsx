import type { CalculatorInputs } from '../lib/computeResults'
import { GuaranteedIncomeSetupPanel } from './GuaranteedIncomeSetupPanel'

type Props = {
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  ssIncluded: boolean
  onSsIncludedChange: (value: boolean) => void
  benefitError?: string
}

export function ConfigGuaranteedIncomeTab({
  inputs,
  setInputs,
  ssIncluded,
  onSsIncludedChange,
  benefitError,
}: Props) {
  return (
    <div className="config-guaranteed-income-tab">
      <GuaranteedIncomeSetupPanel
        inputs={inputs}
        setInputs={setInputs}
        ssIncluded={ssIncluded}
        onSsIncludedChange={onSsIncludedChange}
        userBenefitError={benefitError}
      />
    </div>
  )
}
