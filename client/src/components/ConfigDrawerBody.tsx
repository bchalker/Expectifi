import { useEffect, useState } from 'react'
import type { CalculatorInputs, CalculatorUi, ComputedSnapshot } from '../lib/computeResults'
import { isValidIsoDateString } from '../lib/ageFromDob'
import { fmt, fmtInput, parseNum } from '../utils/format'
import { ConfigSocialSecurityTab } from './ConfigSocialSecurityTab'
import { IncomePresetScenariosCard } from './IncomePresetScenariosCard'
import './ConfigDrawerBody.scss'

const MONTHLY_GOAL_SLIDER_MAX = 100_000
const MONTHLY_GOAL_SLIDER_STEP = 100

export type ConfigDrawerTab = 'plan' | 'social-security' | 'presets'

const TABS: { id: ConfigDrawerTab; label: string }[] = [
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
}

export function ConfigDrawerBody({
  c,
  inputs,
  setInputs,
  ui,
  activePreset,
  setActivePreset,
  initialTab = 'plan',
}: Props) {
  const [tab, setTab] = useState<ConfigDrawerTab>(initialTab)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const ca = c.currentAge
  const tr = inputs.targetRetirementAge

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

      {tab === 'plan' ? (
        <div
          className="config-drawer-tabpanel"
          role="tabpanel"
          id="config-panel-plan"
          aria-labelledby="config-tab-plan"
        >
          <section className="config-drawer-section">
            <p className="footnote footnote--muted config-drawer-lead">
              Your answers set your current age for projections, retirement timing, monthly goal, and how much you save
              each year across the calculator.
            </p>
            <div className="config-plan-row-duo">
              <label className="config-plan-field">
                <span className="config-plan-label">When were you born?</span>
                <input
                  type="date"
                  className="config-plan-input config-plan-input--date"
                  value={inputs.dateOfBirth}
                  onChange={(e) => {
                    const v = e.target.value
                    if (!v || !isValidIsoDateString(v)) return
                    setInputs({ dateOfBirth: v })
                  }}
                />
                <span className="config-plan-age-hint">Age today: {ca}</span>
              </label>
              <label className="config-plan-field">
                <span className="config-plan-label">When would you like to retire?</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="config-plan-input"
                  value={fmtInput(tr)}
                  onChange={(e) => {
                    const n = Math.round(parseNum(e.target.value))
                    if (!Number.isFinite(n)) return
                    const lo = Math.max(50, ca + 1)
                    setInputs({ targetRetirementAge: Math.min(80, Math.max(lo, n)) })
                  }}
                  aria-label="Retirement age"
                />
              </label>
            </div>
            <div className="config-plan-field config-plan-field--goal">
              <span className="config-plan-label" id="config-plan-goal-question">
                What is your monthly goal when you retire?
              </span>
              <div className="config-plan-savings-row">
                <span className="config-plan-saveval">{fmt(inputs.monthlyIncomeGoal)}</span>
                <input
                  type="range"
                  className="config-plan-savings-slider"
                  min={0}
                  max={MONTHLY_GOAL_SLIDER_MAX}
                  step={MONTHLY_GOAL_SLIDER_STEP}
                  value={Math.min(MONTHLY_GOAL_SLIDER_MAX, inputs.monthlyIncomeGoal)}
                  onChange={(e) => {
                    const n = Math.round(Number(e.target.value) / MONTHLY_GOAL_SLIDER_STEP) * MONTHLY_GOAL_SLIDER_STEP
                    setInputs({ monthlyIncomeGoal: n })
                  }}
                  aria-labelledby="config-plan-goal-question"
                  aria-valuemin={0}
                  aria-valuemax={MONTHLY_GOAL_SLIDER_MAX}
                  aria-valuenow={inputs.monthlyIncomeGoal}
                />
              </div>
            </div>
            <div className="config-plan-rows">
              <div className="config-plan-field config-plan-field--savings">
                <span className="config-plan-label">Annual savings to retirement accounts</span>
                <div className="config-plan-savings-row">
                  <span className="config-plan-saveval">{fmt(inputs.save)}</span>
                  <input
                    type="range"
                    className="config-plan-savings-slider"
                    min={0}
                    max={60000}
                    step={500}
                    value={inputs.save}
                    onChange={(e) => setInputs({ save: Math.round(Number(e.target.value) / 500) * 500 })}
                    aria-valuemin={0}
                    aria-valuemax={60000}
                    aria-valuenow={inputs.save}
                  />
                </div>
              </div>
            </div>
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
