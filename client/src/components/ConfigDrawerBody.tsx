import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CalculatorInputs, ComputedSnapshot } from '../lib/computeResults'
import { ConfigSocialSecurityTab } from './ConfigSocialSecurityTab'
import { PlanningProfileFields } from './PlanningProfileFields'
import { planningDisplayFromInputs } from '../lib/userPrefs'
import { findOnboardingRegion } from '../lib/onboardingRegions'
import { useUserLocale } from '../context/UserLocaleContext'
import { saveRegionToProfile } from '../lib/userProfileStorage'
import { ConfigProfileTab } from './ConfigProfileTab'
import './ConfigDrawerBody.scss'
import './PlanningProfileFields.scss'
import './ConfigProfileTab.scss'

import { ConfigLifeTab } from './ConfigLifeTab'
import './ConfigLifeTab.scss'
import type { LifePlans } from '../lib/planStorage/life'

export type ConfigDrawerTab = 'profile' | 'plan' | 'social-security' | 'life'

const TABS: { id: ConfigDrawerTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'plan', label: 'Planning' },
  { id: 'social-security', label: 'Social Security' },
  { id: 'life', label: 'Life' },
]

type TabContextValue = {
  tab: ConfigDrawerTab
  setTab: (tab: ConfigDrawerTab) => void
}

const ConfigDrawerTabContext = createContext<TabContextValue | null>(null)

function useConfigDrawerTab() {
  const ctx = useContext(ConfigDrawerTabContext)
  if (!ctx) {
    throw new Error('Config drawer tabs must be used within ConfigDrawerTabProvider')
  }
  return ctx
}

export function ConfigDrawerTabProvider({
  initialTab = 'plan',
  children,
}: {
  initialTab?: ConfigDrawerTab
  children: ReactNode
}) {
  const [tab, setTab] = useState<ConfigDrawerTab>(initialTab)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  return (
    <ConfigDrawerTabContext.Provider value={{ tab, setTab }}>{children}</ConfigDrawerTabContext.Provider>
  )
}

export function ConfigDrawerTabs() {
  const { tab, setTab } = useConfigDrawerTab()

  return (
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
  )
}

type TabPanelsProps = {
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  ssIncluded: boolean
  onSsIncludedChange: (value: boolean) => void
  ssBenefitError?: string
  onDrawerClose?: () => void
  onOpenRegister?: () => void
  onResetGuestProfile?: () => void
  lifePlans: LifePlans
  onLifePlansChange: (next: LifePlans) => void
  currentYear: number
}

export function ConfigDrawerTabPanels({
  c: _c,
  inputs,
  setInputs,
  ssIncluded,
  onSsIncludedChange,
  ssBenefitError,
  onDrawerClose,
  onOpenRegister,
  onResetGuestProfile,
  lifePlans,
  onLifePlansChange,
  currentYear,
}: TabPanelsProps) {
  const { tab } = useConfigDrawerTab()
  const { locale, refreshLocale } = useUserLocale()
  const planning = planningDisplayFromInputs(inputs)

  return (
    <div className="config-drawer-body">
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
              regionId={locale}
              onRegionSelect={(regionId) => {
                const region = findOnboardingRegion(regionId)
                if (!region) return
                saveRegionToProfile(regionId)
                setInputs({ residenceCountry: region.country })
                refreshLocale()
              }}
              householdIncome={inputs.other}
              onHouseholdIncome={(other) => setInputs({ other })}
              monthlyContribution={planning.save > 0 ? Math.round(planning.save / 12) : 0}
              onMonthlyContribution={(amount) => setInputs({ save: amount * 12 })}
              growthGoal={planning.growthGoal}
              onGrowthGoal={(growthGoal) => setInputs({ growthGoal })}
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
            <ConfigSocialSecurityTab
              inputs={inputs}
              setInputs={setInputs}
              ssIncluded={ssIncluded}
              onSsIncludedChange={onSsIncludedChange}
              benefitError={ssBenefitError}
            />
          </section>
        </div>
      ) : null}

      {tab === 'life' ? (
        <div
          className="config-drawer-tabpanel"
          role="tabpanel"
          id="config-panel-life"
          aria-labelledby="config-tab-life"
        >
          <ConfigLifeTab plans={lifePlans} onPlansChange={onLifePlansChange} currentYear={currentYear} />
        </div>
      ) : null}
    </div>
  )
}
