import type { ReactNode } from 'react'
import { AppButton } from './ui/AppButton'
import './HoldingScenarioIntentTabs.scss'

type OutlookChoice = 'bull' | 'bear' | 'base'

type OutlookTile = { choice: OutlookChoice; label: string; hint: string }

/** Bear / Normal / Bull segmented control (no HeroUI Tabs.Indicator). */
export function OutlookMarketTabs({
  value,
  onChange,
  tiles,
}: {
  value: OutlookChoice
  onChange: (choice: OutlookChoice) => void
  tiles: readonly OutlookTile[]
}) {
  return (
    <div className="holding-scenario-outlook-tabs" role="tablist" aria-label="Market outlook">
      <div className="holding-scenario-outlook-tabs__list">
        {tiles.map((t) => (
          <button
            key={t.choice}
            type="button"
            role="tab"
            aria-selected={value === t.choice}
            className={`holding-scenario-outlook-tabs__tab holding-scenario-outlook-tabs__tab--${t.choice}${
              value === t.choice ? ' holding-scenario-outlook-tabs__tab--selected' : ''
            }`}
            onClick={() => onChange(t.choice)}
          >
            <span className="holding-scenario-outlook-tabs__tab-label">{t.label}</span>
            <span className="holding-scenario-outlook-tabs__tab-hint">{t.hint}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export type ScenarioIntentTabId = 'default' | 'outlook' | 'custom' | 'peryear'

export type HoldingScenarioIntentTabsProps = {
  activeTab: ScenarioIntentTabId
  onTabChange: (tab: ScenarioIntentTabId) => void
  globalPct: string
  onUseGlobalRate: () => void
  globalUsingActive?: boolean
  outlookValue: OutlookChoice
  onOutlookChange: (choice: OutlookChoice) => void
  outlookTiles: readonly { choice: OutlookChoice; label: string; hint: string }[]
  draftPct: string
  onDraftPctChange: (value: string) => void
  onDraftPctBlur: () => void
  yearGrid: ReactNode
  variant?: 'holding' | 'account'
  className?: string
}

const TAB_ITEMS: { id: ScenarioIntentTabId; label: string }[] = [
  { id: 'default', label: 'Global' },
  { id: 'outlook', label: 'Market outlook' },
  { id: 'custom', label: 'Custom rate' },
  { id: 'peryear', label: 'Per year' },
]

export function HoldingScenarioIntentTabs({
  activeTab,
  onTabChange,
  globalPct,
  onUseGlobalRate,
  globalUsingActive = false,
  outlookValue,
  onOutlookChange,
  outlookTiles,
  draftPct,
  onDraftPctChange,
  onDraftPctBlur,
  yearGrid,
  variant = 'holding',
  className = '',
}: HoldingScenarioIntentTabsProps) {
  const isAccount = variant === 'account'

  return (
    <div
      className={['holding-scenario-intent-tabs', className].filter(Boolean).join(' ')}
    >
      <div className="holding-scenario-intent-tabs__list" role="tablist" aria-label="Growth modeling approach">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`holding-scenario-intent-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`holding-scenario-intent-panel-${tab.id}`}
            className={[
              'holding-scenario-intent-tabs__tab',
              activeTab === tab.id && 'holding-scenario-intent-tabs__tab--active',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="holding-scenario-intent-tabs__panels">
        <div
          id="holding-scenario-intent-panel-default"
          role="tabpanel"
          aria-labelledby="holding-scenario-intent-tab-default"
          hidden={activeTab !== 'default'}
          className="holding-scenario-intent-tabs__panel"
        >
          <p className="holding-scenario-intent-tabs__desc">
            {isAccount
              ? 'Holdings in this account without their own scenario follow the same annual return as your global retirement slider.'
              : 'Use the same annual return as your global retirement slider for this holding across all accounts.'}
          </p>
          <AppButton
            type="button"
            size="sm"
            variant={globalUsingActive ? 'secondary' : 'primary'}
            className="holding-scenario-intent-tabs__action"
            onPress={onUseGlobalRate}
            isDisabled={globalUsingActive}
          >
            {globalUsingActive ? `Using ${globalPct}% return` : `Use the ${globalPct}% return`}
          </AppButton>
        </div>

        <div
          id="holding-scenario-intent-panel-outlook"
          role="tabpanel"
          aria-labelledby="holding-scenario-intent-tab-outlook"
          hidden={activeTab !== 'outlook'}
          className="holding-scenario-intent-tabs__panel"
        >
          <p className="holding-scenario-intent-tabs__desc">
            {isAccount
              ? 'Apply a preset path that leans bearish, neutral, or bullish across the years until retirement.'
              : 'Model this holding with a preset path that leans bearish, neutral, or bullish until retirement.'}
          </p>
          <OutlookMarketTabs value={outlookValue} onChange={onOutlookChange} tiles={outlookTiles} />
        </div>

        <div
          id="holding-scenario-intent-panel-custom"
          role="tabpanel"
          aria-labelledby="holding-scenario-intent-tab-custom"
          hidden={activeTab !== 'custom'}
          className="holding-scenario-intent-tabs__panel"
        >
          <p className="holding-scenario-intent-tabs__desc">
            {isAccount
              ? 'Set one flat annual return for every holding in this account that does not have its own scenario.'
              : 'Enter one flat annual return for this holding in every account where it appears.'}
          </p>
          <div className="holding-scenario-intent-tabs__custom-field">
            <label className="holding-scenario-intent-tabs__custom-label" htmlFor="holding-scenario-custom-pct">
              Annual return
            </label>
            <div className="holding-scenario-intent-tabs__custom-input-wrap">
              <input
                id="holding-scenario-custom-pct"
                type="text"
                inputMode="decimal"
                className="holding-scenario-intent-tabs__custom-input"
                value={draftPct}
                onChange={(e) => onDraftPctChange(e.target.value)}
                onBlur={onDraftPctBlur}
              />
              <span className="holding-scenario-intent-tabs__custom-suffix" aria-hidden>
                %
              </span>
            </div>
          </div>
        </div>

        <div
          id="holding-scenario-intent-panel-peryear"
          role="tabpanel"
          aria-labelledby="holding-scenario-intent-tab-peryear"
          hidden={activeTab !== 'peryear'}
          className="holding-scenario-intent-tabs__panel"
        >
          <p className="holding-scenario-intent-tabs__desc">
            {isAccount
              ? 'Set a different return for each calendar year until retirement for holdings without their own scenario.'
              : 'Set a different return for each calendar year until retirement for this holding.'}
          </p>
          {yearGrid}
        </div>
      </div>
    </div>
  )
}
