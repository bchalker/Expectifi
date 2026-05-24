import { useEffect, useState } from 'react'
import type { CalculatorInputs, ComputedSnapshot } from '../lib/computeResults'
import { ConfigSocialSecurityTab } from './ConfigSocialSecurityTab'
import { PlanningProfileFields } from './PlanningProfileFields'
import { planningDisplayFromInputs } from '../lib/userPrefs'
import { ConfigProfileTab } from './ConfigProfileTab'
import './ConfigDrawerBody.scss'
import './PlanningProfileFields.scss'
import './ConfigProfileTab.scss'

export type ConfigDrawerTab = 'profile' | 'plan' | 'social-security'

const TABS: { id: ConfigDrawerTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'plan', label: 'Planning' },
  { id: 'social-security', label: 'Social Security' },
]

type Props = {
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  initialTab?: ConfigDrawerTab
  onDrawerClose?: () => void
  onOpenSignIn?: () => void
  onOpenRegister?: () => void
  onResetGuestProfile?: () => void
}

export function ConfigDrawerBody({
  c: _c,
  inputs,
  setInputs,
  initialTab = 'plan',
  onDrawerClose,
  onOpenSignIn,
  onOpenRegister,
  onResetGuestProfile,
}: Props) {
  const [tab, setTab] = useState<ConfigDrawerTab>(initialTab)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const planning = planningDisplayFromInputs(inputs)

  return (
    <div className="config-drawer-body">
      <div className="config-drawer-tabs config-drawer-tabs--classic" role="tablist" aria-label="Configure sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`config-tab-${t.id}`}
            type="button"
            role="tab"
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            aria-selected={tab === t.id}
            aria-controls={`config-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' ? (
        <div
          className="config-drawer-tabpanel"
          role="tabpanel"
          id="config-panel-profile"
          aria-labelledby="config-tab-profile"
        >
          <section className="config-drawer-section">
            <ConfigProfileTab
              onAccountCancelled={onDrawerClose}
              onOpenSignIn={onOpenSignIn}
              onOpenRegister={onOpenRegister}
              onResetGuestProfile={onResetGuestProfile}
            />
          </section>
        </div>
      ) : null}

      {tab === 'plan' ? (
        <div
          className="config-drawer-tabpanel"
          role="tabpanel"
          id="config-panel-plan"
          aria-labelledby="config-tab-plan"
        >
          <section className="config-drawer-section">
            <PlanningProfileFields
              variant="configure"
              dateOfBirth={inputs.dateOfBirth}
              onDateOfBirth={(iso) => setInputs({ dateOfBirth: iso })}
              targetRetirementAge={inputs.targetRetirementAge}
              onTargetRetirementAge={(targetRetirementAge) =>
                setInputs({ targetRetirementAge })
              }
              currentResidence={inputs.residenceCountry ?? ''}
              onCurrentResidence={(residenceCountry) => setInputs({ residenceCountry })}
              householdIncome={inputs.other}
              onHouseholdIncome={(other) => setInputs({ other })}
              monthlyContribution={planning.save > 0 ? Math.round(planning.save / 12) : 0}
              onMonthlyContribution={(amount) => setInputs({ save: amount * 12 })}
              monthlyIncomeGoal={planning.monthlyIncomeGoal}
              onMonthlyIncomeGoal={(monthlyIncomeGoal) => setInputs({ monthlyIncomeGoal })}
            />
          </section>
        </div>
      ) : null}

      {tab === 'social-security' ? (
        <div
          className="config-drawer-tabpanel"
          role="tabpanel"
          id="config-panel-social-security"
          aria-labelledby="config-tab-social-security"
        >
          <section className="config-drawer-section">
            <ConfigSocialSecurityTab inputs={inputs} setInputs={setInputs} />
          </section>
        </div>
      ) : null}
    </div>
  )
}
