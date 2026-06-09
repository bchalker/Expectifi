import type { CalculatorInputs } from '../lib/computeResults'
import { GuaranteedIncomeSetupPanel } from './GuaranteedIncomeSetupPanel'

type Props = {
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  benefitError?: string
}

export function ConfigGuaranteedIncomeTab({
  inputs,
  setInputs,
  benefitError,
}: Props) {
  return (
    <div className="config-guaranteed-income-tab">
      <GuaranteedIncomeSetupPanel
        inputs={inputs}
        setInputs={setInputs}
        userBenefitError={benefitError}
      />
    </div>
  )
}
