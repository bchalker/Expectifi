import { useEffect, useState } from 'react'
import type { CalculatorInputs, CalculatorUi, ComputedSnapshot } from '../lib/computeResults'
import { ConfigSocialSecurityTab } from './ConfigSocialSecurityTab'
import { PlanningProfileFields } from './PlanningProfileFields'
import { IncomePresetScenariosCard } from './IncomePresetScenariosCard'
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
}

export function ConfigDrawerBody({
  c,
  inputs,
  setInputs,
  ui,
  activePreset,
  setActivePreset,
  initialTab = 'plan',
  onDrawerClose,
}: Props) {
  const [tab, setTab] = useState<ConfigDrawerTab>(initialTab)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

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
            <ConfigProfileTab onAccountCancelled={onDrawerClose} />
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
            <p className="footnote footnote--muted config-drawer-lead">
              Your answers set your current age for projections, retirement timing, growth and income goals, and how much
              you save each year across the calculator.
            </p>
            <PlanningProfileFields
              variant="configure"
              dateOfBirth={inputs.dateOfBirth}
              onDateOfBirth={(iso) => setInputs({ dateOfBirth: iso })}
              targetRetirementAge={inputs.targetRetirementAge}
              onTargetRetirementAge={(targetRetirementAge) => setInputs({ targetRetirementAge })}
              growthGoal={inputs.growthGoal}
              onGrowthGoal={(growthGoal) => setInputs({ growthGoal })}
              monthlyIncomeGoal={inputs.monthlyIncomeGoal}
              onMonthlyIncomeGoal={(monthlyIncomeGoal) => setInputs({ monthlyIncomeGoal })}
              annualSave={inputs.save}
              onAnnualSave={(save) => setInputs({ save })}
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
            <ConfigSocialSecurityTab c={c} inputs={inputs} setInputs={setInputs} />
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
