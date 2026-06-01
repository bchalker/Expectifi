import { useMemo, useState, type ReactNode } from 'react'
import {
  formatOutlookScenarioRateRange,
  getOutlookScenarioTileLabel,
  outlookCalloutAmountLabel,
  outlookCalloutDirectionWord,
  outlookProjectionDeltaTone,
  outlookRetirementDelta,
  type OutlookScenarioChoice,
  type OutlookScenarioTile,
} from '../lib/holdingScenarioApply'
import './HoldingScenarioIntentTabs.scss'

/** Bear / Normal / Bull segmented control (no HeroUI Tabs.Indicator). */
export function OutlookMarketTabs({
  value,
  onChange,
  tiles,
  globalBlended,
  horizon,
  previewCurrentValue,
  scope = 'account',
}: {
  value: OutlookScenarioChoice | null
  onChange: (choice: OutlookScenarioChoice) => void
  tiles: readonly OutlookScenarioTile[]
  globalBlended: number
  horizon: number
  previewCurrentValue: number
  scope?: 'account' | 'holding'
}) {
  const [hoveredChoice, setHoveredChoice] = useState<OutlookScenarioChoice | null>(null)
  const focusChoice = hoveredChoice ?? value

  const tileDeltas = useMemo(() => {
    const deltas: Record<OutlookScenarioChoice, number> = {
      very_bear: 0,
      bear: 0,
      base: 0,
      bull: 0,
      very_bull: 0,
    }
    for (const t of tiles) {
      deltas[t.choice] = outlookRetirementDelta(previewCurrentValue, globalBlended, t.choice, horizon)
    }
    return deltas
  }, [globalBlended, horizon, previewCurrentValue, tiles])

  const calloutDelta = focusChoice != null ? tileDeltas[focusChoice] : 0
  const calloutTone = focusChoice != null ? outlookProjectionDeltaTone(focusChoice, calloutDelta) : 'neutral'
  const calloutDirection =
    focusChoice != null ? outlookCalloutDirectionWord(focusChoice, calloutDelta) : 'same'
  const scopeNoun = scope === 'holding' ? 'holding' : 'account'

  return (
    <div className="holding-scenario-outlook-tabs">
      <div className="holding-scenario-outlook-tabs__list" role="tablist" aria-label="Market outlook">
        {tiles.map((t) => {
          const rateRangeLabel = formatOutlookScenarioRateRange(t.choice, horizon)
          const isSelected = value === t.choice
          const isFocused = focusChoice === t.choice

          return (
            <button
              key={t.choice}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={[
                'holding-scenario-outlook-tabs__tab',
                `holding-scenario-outlook-tabs__tab--${t.choice}`,
                isSelected && 'holding-scenario-outlook-tabs__tab--selected',
                isFocused && 'holding-scenario-outlook-tabs__tab--focused',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onChange(t.choice)}
              onMouseEnter={() => setHoveredChoice(t.choice)}
              onMouseLeave={() => setHoveredChoice(null)}
              onFocus={() => setHoveredChoice(t.choice)}
              onBlur={() => setHoveredChoice(null)}
            >
              <span className="holding-scenario-outlook-tabs__tab-row">
                <span className="holding-scenario-outlook-tabs__tab-copy">
                  <span className="holding-scenario-outlook-tabs__tab-label">{t.label}</span>
                  <span className="holding-scenario-outlook-tabs__tab-desc">{t.hint}</span>
                </span>
                <span className="holding-scenario-outlook-tabs__tab-range-col">
                  <span className="holding-scenario-outlook-tabs__tab-range-label font-xs">Range</span>
                  <span
                    className="holding-scenario-outlook-tabs__tab-rate"
                    title="Annual return range across years until retirement"
                  >
                    {rateRangeLabel}
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
      {focusChoice != null ? (
        <p className="holding-scenario-outlook-tabs__callout" role="status">
          Under {getOutlookScenarioTileLabel(focusChoice)} this {scopeNoun} projects to{' '}
          {calloutDirection === 'same' ? (
            <span className="holding-scenario-outlook-tabs__callout-amount holding-scenario-outlook-tabs__callout-amount--neutral">
              about the same
            </span>
          ) : (
            <>
              <span
                className={[
                  'holding-scenario-outlook-tabs__callout-amount',
                  `holding-scenario-outlook-tabs__callout-amount--${calloutTone}`,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {outlookCalloutAmountLabel(calloutDelta)}
              </span>{' '}
              {calloutDirection} at retirement
            </>
          )}
        </p>
      ) : null}
    </div>
  )
}

export type ScenarioIntentTabId = 'outlook' | 'custom' | 'peryear'

export type HoldingScenarioIntentTabsProps = {
  activeTab: ScenarioIntentTabId
  onTabChange: (tab: ScenarioIntentTabId) => void
  outlookValue: OutlookScenarioChoice | null
  onOutlookChange: (choice: OutlookScenarioChoice) => void
  outlookTiles: readonly OutlookScenarioTile[]
  globalBlended: number
  outlookHorizon: number
  outlookPreviewCurrentValue: number
  draftPct: string
  onDraftPctChange: (value: string) => void
  onDraftPctBlur: () => void
  yearGrid: ReactNode
  variant?: 'holding' | 'account'
  className?: string
}

const TAB_ITEMS: { id: ScenarioIntentTabId; label: string }[] = [
  { id: 'outlook', label: 'Market outlook' },
  { id: 'custom', label: 'Custom rate' },
  { id: 'peryear', label: 'Per year' },
]

export function HoldingScenarioIntentTabs({
  activeTab,
  onTabChange,
  outlookValue,
  onOutlookChange,
  outlookTiles,
  globalBlended,
  outlookHorizon,
  outlookPreviewCurrentValue,
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
          <OutlookMarketTabs
            value={outlookValue}
            onChange={onOutlookChange}
            tiles={outlookTiles}
            globalBlended={globalBlended}
            horizon={outlookHorizon}
            previewCurrentValue={outlookPreviewCurrentValue}
            scope={variant}
          />
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
