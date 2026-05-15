import { useEffect, useState } from 'react'
import type { CalculatorInputs, CalculatorUi, ComputedSnapshot } from '../lib/computeResults'
import type { BalanceInputMode } from '../lib/retirementBalanceMode'
import type { BrokerageBalanceMode } from '../lib/brokerageBalanceMode'
import { isValidIsoDateString } from '../lib/ageFromDob'
import { fmt, fmtInput, parseNum } from '../utils/format'
import { BrokerageCard } from './BrokerageCard'
import { ConfigSocialSecurityTab } from './ConfigSocialSecurityTab'
import { IncomePresetScenariosCard } from './IncomePresetScenariosCard'
import './ConfigDrawerBody.scss'

export type ConfigDrawerTab = 'plan' | 'social-security' | 'accounts' | 'presets'

const TABS: { id: ConfigDrawerTab; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'social-security', label: 'Social Security' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'presets', label: 'Presets' },
]

type Props = {
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  ui: CalculatorUi
  activePreset: string | null
  setActivePreset: (id: string | null) => void
  balanceMode: BalanceInputMode
  onBalanceModeChange: (m: BalanceInputMode) => void
  brokerageMode: BrokerageBalanceMode
  onBrokerageModeChange: (m: BrokerageBalanceMode) => void
  fidelityImportRev: number
  onFidelityApplyBalances: (b: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onFidelityImportAppliedRetirement: () => void
  onFidelityImportAppliedBrokerage: () => void
  initialTab?: ConfigDrawerTab
}

export function ConfigDrawerBody({
  c,
  inputs,
  setInputs,
  ui,
  activePreset,
  setActivePreset,
  balanceMode: _balanceMode,
  onBalanceModeChange: _onBalanceModeChange,
  brokerageMode,
  onBrokerageModeChange,
  fidelityImportRev,
  onFidelityApplyBalances,
  onFidelityImportAppliedRetirement: _onFidelityImportAppliedRetirement,
  onFidelityImportAppliedBrokerage,
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
      <div className="config-drawer-tabs" role="tablist" aria-label="Configure sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plan' ? (
        <section className="config-drawer-section">
          <div className="section-title">Plan</div>
          <p className="footnote footnote--muted config-drawer-lead">
            Date of birth sets your current age for projections. Retirement age, after-tax monthly goal, and annual
            retirement savings apply across the calculator.
          </p>
          <div className="config-plan-row-triple">
            <label className="config-plan-field">
              <span className="config-plan-label">Date of birth</span>
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
              <span className="config-plan-label">Retire at (age)</span>
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
              />
            </label>
            <label className="config-plan-field config-plan-field--goal">
              <span className="config-plan-label">After-tax goal / mo</span>
              <span className="num-input-wrap">
                <span className="num-input-prefix">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="num-input"
                  value={fmtInput(inputs.monthlyIncomeGoal)}
                  onChange={(e) => setInputs({ monthlyIncomeGoal: Math.max(0, parseNum(e.target.value)) })}
                  placeholder="0"
                />
              </span>
            </label>
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
      ) : null}

      {tab === 'social-security' ? (
        <section className="config-drawer-section">
          <div className="section-title">Social Security</div>
          <ConfigSocialSecurityTab c={c} inputs={inputs} setInputs={setInputs} />
        </section>
      ) : null}

      {tab === 'accounts' ? (
        <section className="config-drawer-section">
          <div className="section-title">Retirement accounts & brokerage</div>
          <p className="footnote footnote--muted" style={{ margin: '0 0 12px', border: 'none', padding: 0 }}>
            Set retirement balances on the dashboard using <strong>Manually add values</strong> or{' '}
            <strong>Use imported CSV</strong> in the Retirement account balances section. Brokerage entry remains below.
          </p>
          <BrokerageCard
            configureInputsOnly
            brkBal={inputs.brkBal}
            onBrkBal={(n) => setInputs({ brkBal: n })}
            brkRate={inputs.brkRate}
            onBrkRate={(r) => setInputs({ brkRate: r })}
            brokerageMode={brokerageMode}
            onBrokerageModeChange={onBrokerageModeChange}
            fidelityImportRev={fidelityImportRev}
            onFidelityApplyBalances={onFidelityApplyBalances}
            onFidelityImportApplied={onFidelityImportAppliedBrokerage}
          />
        </section>
      ) : null}

      {tab === 'presets' ? (
        <section className="config-drawer-section">
          <div className="section-title">Dividend yield presets</div>
          <IncomePresetScenariosCard
            ui={ui}
            inputs={inputs}
            setInputs={setInputs}
            activePreset={activePreset}
            setActivePreset={setActivePreset}
            alwaysShow
          />
        </section>
      ) : null}
    </div>
  )
}
