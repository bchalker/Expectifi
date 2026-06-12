import { IconX } from '@tabler/icons-react'
import { ScenarioPerYearGrid } from '../ScenarioPerYearGrid'
import type { ScenarioIntentTabId } from '../HoldingScenarioIntentTabs'
import { accountScenarioIsActive, type AccountScenarioBucketId } from '../../lib/accountReturnScenario'
import type { CalculatorInputs } from '../../lib/computeResults'
import type { ImportedPositionRow } from '../../lib/positionsCsv'
import { useAccountScenarioState } from '../../hooks/useAccountScenarioState'
import { HoldingScenarioPanelFooter } from '../HoldingScenarioPanelFooter'
import { AppButton } from '../ui/AppButton'
import { AccountScenarioOutlookGrid } from './AccountScenarioOutlookGrid'
import { AccountScenarioPopoutCustomRate } from './AccountScenarioPopoutCustomRate'
import './AccountScenarioPopout.scss'

const TABS: { id: ScenarioIntentTabId; label: string }[] = [
  { id: 'outlook', label: 'Market outlook' },
  { id: 'custom', label: 'Custom rate' },
  { id: 'peryear', label: 'Per year' },
]

export type AccountScenarioPopoutProps = {
  accountName: string
  bucket: AccountScenarioBucketId
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  importedPositionRows: ImportedPositionRow[]
  yearsToRetirement: number
  retirementCalendarYear: number
  retRate: number
  brkRate: number
  initialTab?: ScenarioIntentTabId
  onClose: () => void
  /** Inside HeroUI Popover — chrome comes from popover shell. */
  variant?: 'standalone' | 'heroui'
}

export function AccountScenarioPopout({
  accountName,
  bucket,
  inputs,
  setInputs,
  importedPositionRows,
  yearsToRetirement,
  retirementCalendarYear,
  retRate,
  brkRate,
  initialTab,
  onClose,
  variant = 'standalone',
}: AccountScenarioPopoutProps) {
  const state = useAccountScenarioState({
    bucket,
    inputs,
    setInputs,
    importedPositionRows,
    yearsToRetirement,
    retirementCalendarYear,
    retRate,
    brkRate,
    initialTab,
  })

  const onNoScenario = () => {
    state.clearToGlobalRate()
    onClose()
  }

  return (
    <div
      className={[
        'account-scenario-popout',
        variant === 'heroui' && 'account-scenario-popout--heroui-inner',
      ]
        .filter(Boolean)
        .join(' ')}
      role={variant === 'standalone' ? 'dialog' : undefined}
      aria-labelledby="account-scenario-popout-title"
    >
      <header className="account-scenario-popout__head">
        <div className="account-scenario-popout__head-text">
          <p className="account-scenario-popout__eyebrow">Account scenario</p>
          <h2 className="account-scenario-popout__title" id="account-scenario-popout-title">
            {accountName}
          </h2>
        </div>
        <button
          type="button"
          className="account-scenario-popout__close"
          onClick={onClose}
          aria-label="Close"
        >
          <IconX size={14} stroke={1.5} aria-hidden />
        </button>
      </header>

      <div className="account-scenario-popout__tabs" role="tablist" aria-label="Scenario type">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={state.activeTab === tab.id}
            className={[
              'account-scenario-popout__tab',
              state.activeTab === tab.id && 'account-scenario-popout__tab--active',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => state.onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="account-scenario-popout__body">
        {state.overrideConflict ? (
          <div className="account-scenario-popout__conflict" role="status">
            <p className="account-scenario-popout__conflict-text">
              <strong>{state.overrideConflict.count}</strong> holding
              {state.overrideConflict.count === 1 ? '' : 's'} already have{' '}
              <strong>{state.scenarioChoiceConflictLabel(state.overrideConflict.choice)}</strong>{' '}
              set individually. Remove their overrides and let them inherit from this account
              instead?
            </p>
            <div className="account-scenario-popout__conflict-actions">
              <AppButton type="button" size="sm" variant="primary" onPress={state.onRemoveOverrides}>
                Remove overrides
              </AppButton>
              <AppButton type="button" size="sm" variant="secondary" onPress={state.onKeepBothOverrides}>
                Keep both
              </AppButton>
            </div>
          </div>
        ) : null}

        {state.activeTab === 'outlook' ? (
          <AccountScenarioOutlookGrid
            horizon={state.h}
            selection={state.outlookSelection}
            onSelect={state.onSelectOutlookTile}
          />
        ) : null}

        {state.activeTab === 'custom' ? (
          <AccountScenarioPopoutCustomRate
            draftPct={state.draftPct}
            onDraftPctChange={(value) => {
              state.setDraftPct(value)
              state.tryPatchAccount('custom', state.parseScenarioPct(value))
            }}
            onDraftPctBlur={() => {
              const nextPct = state.clampPct(state.parseScenarioPct(state.draftPct))
              state.setDraftPct(String(nextPct))
              state.tryPatchAccount('custom', nextPct)
            }}
          />
        ) : null}

        {state.activeTab === 'peryear' && state.showPerYearGrid && state.primaryModel ? (
          <ScenarioPerYearGrid
            className="scenario-per-year-grid--popout"
            retirementCalendarYear={state.calY}
            yearsToRetirement={state.yearsToRetirement}
            globalBlended={state.blended}
            yearlyReturns={state.primaryModel.yearlyReturns}
            onPatchRates={state.patchYearRates}
          />
        ) : null}
      </div>

      <HoldingScenarioPanelFooter
        className="account-scenario-popout__foot"
        hasScenario={accountScenarioIsActive(inputs, bucket)}
        onNoScenario={onNoScenario}
        onDone={onClose}
      />
    </div>
  )
}
