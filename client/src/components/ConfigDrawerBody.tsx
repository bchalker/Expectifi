import { useEffect, useState } from 'react'
import type { CalculatorInputs, CalculatorUi, ComputedSnapshot } from '../lib/computeResults'
import { ConfigSocialSecurityTab } from './ConfigSocialSecurityTab'
import { PlanningProfileFields } from './PlanningProfileFields'
import { IncomePresetScenariosCard } from './IncomePresetScenariosCard'
import { planningDisplayFromInputs } from '../lib/userPrefs'
import { ConfigProfileTab } from './ConfigProfileTab'
import './ConfigDrawerBody.scss'
import './PlanningProfileFields.scss'
import './ConfigProfileTab.scss'

export type ConfigDrawerTab = 'profile' | 'plan' | 'social-security' | 'presets'

const TABS: { id: ConfigDrawerTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'plan', label: 'Planning' },
  { id: 'social-security', label: 'Social Security' },
  { id: 'presets', label: 'Income Presets' },
]

type Props = {
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  ui: CalculatorUi
  activePreset: string | null
  setActivePreset: (id: string | null) => void
  initialTab?: ConfigDrawerTab
  onDrawerClose?: () => void
  onOpenSignIn?: () => void
  onOpenRegister?: () => void
}

export function ConfigDrawerBody({
  c: _c,
  inputs,
  setInputs,
  ui,
  activePreset,
  setActivePreset,
  initialTab = 'plan',
  onDrawerClose,
  onOpenSignIn,
  onOpenRegister,
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
              dateOfBirth={planning.dateOfBirth}
              onDateOfBirth={(iso) => setInputs({ dateOfBirth: iso })}
              targetRetirementAge={planning.targetRetirementAge}
              onTargetRetirementAge={(targetRetirementAge) => setInputs({ targetRetirementAge })}
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

      {tab === 'presets' ? (
        <div
          className="config-drawer-tabpanel"
          role="tabpanel"
          id="config-panel-presets"
          aria-labelledby="config-tab-presets"
        >
          <section className="config-drawer-section">
            <IncomePresetScenariosCard
              ui={ui}
              inputs={inputs}
              setInputs={setInputs}
              activePreset={activePreset}
              setActivePreset={setActivePreset}
              alwaysShow
            />
          </section>
        </div>
      ) : null}
    </div>
  )
}
