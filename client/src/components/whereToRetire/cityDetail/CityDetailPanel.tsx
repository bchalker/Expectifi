import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { AppOverlayScrollbars } from '../../ui/AppOverlayScrollbars'
import { AppSelect } from '../../ui/AppSelect'
import {
  IconChartBar,
  IconCoins,
  IconFileText,
  IconPlane,
  IconSun,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react'
import { useCityClimate } from '../../../hooks/useCityClimate'
import type { MapFilters, ScoredMapCity } from '../../../lib/whereToRetire/cityMapScoring'
import { monthlyBudgetForScoring } from '../../../lib/whereToRetire/cityMapScoring'
import type { PreferenceStep, RetirementPreferences } from '../../../types/preferences'
import type { BudgetBreakdownDisplay } from '../../../utils/costOfLiving'
import { DEMOGRAPHICS_TAB_SOURCE_FOOTER } from '../../../utils/demographics'
import { calculateRetirementScore } from '../../../utils/retirementScore'
import type { DestinationListNav } from '../RetirementDestinationPanel'
import { WtrCityListPagination } from '../WtrCityListPagination'
import { CityDetailPanelHeader } from './CityDetailPanelHeader'
import { CostOfLivingTab } from './CostOfLivingTab'
import { ExpatLifeTab } from './ExpatLifeTab'
import { GettingThereTab } from './GettingThereTab'
import { PeopleAndCultureTab } from './PeopleAndCultureTab'
import { QualityOfLifeTab } from './QualityOfLifeTab'
import { TaxVisaTab } from './TaxVisaTab'
import { WeatherTab } from './WeatherTab'
import './CityDetailPanel.scss'
import './TaxVisaTab.scss'

export type CityDetailTab =
  | 'col'
  | 'weather'
  | 'gettingThere'
  | 'taxVisa'
  | 'qol'
  | 'peopleCulture'
  | 'expatLife'

const PANEL_TABS: {
  id: CityDetailTab
  label: string
  tabId: string
  panelId: string
  icon: ReactNode
}[] = [
  {
    id: 'col',
    label: 'Cost of living',
    tabId: 'wtr-dest-tab-col',
    panelId: 'wtr-dest-tabpanel-col',
    icon: <IconCoins size={16} stroke={1.5} />,
  },
  {
    id: 'weather',
    label: 'Weather',
    tabId: 'wtr-dest-tab-weather',
    panelId: 'wtr-dest-tabpanel-weather',
    icon: <IconSun size={16} stroke={1.5} />,
  },
  {
    id: 'gettingThere',
    label: 'Flights',
    tabId: 'wtr-dest-tab-getting-there',
    panelId: 'wtr-dest-tabpanel-getting-there',
    icon: <IconPlane size={16} stroke={1.5} />,
  },
  {
    id: 'taxVisa',
    label: 'Tax & visa',
    tabId: 'wtr-dest-tab-tax-visa',
    panelId: 'wtr-dest-tabpanel-tax-visa',
    icon: <IconFileText size={16} stroke={1.5} />,
  },
  {
    id: 'qol',
    label: 'Quality of life',
    tabId: 'wtr-dest-tab-qol',
    panelId: 'wtr-dest-tabpanel-qol',
    icon: <IconChartBar size={16} stroke={1.5} />,
  },
  {
    id: 'peopleCulture',
    label: 'Community',
    tabId: 'wtr-dest-tab-people-culture',
    panelId: 'wtr-dest-tabpanel-people-culture',
    icon: <IconUsers size={16} stroke={1.5} />,
  },
  {
    id: 'expatLife',
    label: 'Expat life',
    tabId: 'wtr-dest-tab-expat-life',
    panelId: 'wtr-dest-tabpanel-expat-life',
    icon: <IconUsersGroup size={16} stroke={1.5} />,
  },
]

const PANEL_ESTIMATES_NOTE =
  'Estimates based on real prices reported by locals. Updated periodically. All amounts in USD.'

function panelStaggerStyle(index: number): CSSProperties {
  return { '--wtr-panel-i': index } as CSSProperties
}

function CityDetailTabSelect({
  activeTab,
  onChange,
  variant = 'default',
}: {
  activeTab: CityDetailTab
  onChange: (tab: CityDetailTab) => void
  variant?: 'default' | 'sheet'
}) {
  const activeLabel = PANEL_TABS.find((tab) => tab.id === activeTab)?.label ?? 'Section'

  if (variant === 'sheet') {
    return (
      <div className="wtr-city-detail__tab-select wtr-city-detail__tab-select--sheet">
        <div className="wtr-city-detail__tab-select-sheet-inner">
          <span className="wtr-city-detail__tab-select-display" aria-hidden>
            {activeLabel}
          </span>
          <div className="wtr-city-detail__tab-select-hit">
            <AppSelect
              className="wtr-city-detail__tab-select-native"
              ariaLabel="Destination section"
              value={activeTab}
              options={PANEL_TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
              }))}
              onChange={(id) => onChange(id as CityDetailTab)}
              layout="native"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppSelect
      className="wtr-city-detail__tab-select"
      ariaLabel="Destination section"
      label="Section"
      labelClassName="wtr-city-detail__tab-select-label"
      value={activeTab}
      options={PANEL_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
      onChange={(id) => onChange(id as CityDetailTab)}
      popoverClassName="wtr-city-detail__tab-select-popover"
      layout="auto"
    />
  )
}

type CityDetailPanelBodyProps = {
  scored: ScoredMapCity
  budgetBreakdown: BudgetBreakdownDisplay
  mobileSheet: boolean
  listNav: DestinationListNav | null
  activeTab: CityDetailTab
  onActiveTabChange: (tab: CityDetailTab) => void
  climatePreferenceStep: PreferenceStep
  climatePreferenceDirection: RetirementPreferences['climatePreference']
}

function CityDetailPanelBody({
  scored,
  budgetBreakdown,
  mobileSheet,
  listNav,
  activeTab,
  onActiveTabChange,
  climatePreferenceStep,
  climatePreferenceDirection,
}: CityDetailPanelBodyProps) {
  const activeTabMeta = PANEL_TABS.find((t) => t.id === activeTab)
  const {
    climate,
    loading: climateLoading,
    failed: climateFailed,
  } = useCityClimate(scored.city)

  const { city } = scored

  const tabContent = (() => {
    const staggerClassName = 'wtr-city-detail__stagger-item'
    const staggerStyle = panelStaggerStyle

    switch (activeTab) {
      case 'col':
        return (
          <CostOfLivingTab
            city={scored.city}
            budgetBreakdown={budgetBreakdown}
            staggerClassName={staggerClassName}
            staggerStyle={staggerStyle}
          />
        )
      case 'weather':
        return (
          <WeatherTab
            climate={climate}
            climatePreferenceStep={climatePreferenceStep}
            climatePreferenceDirection={climatePreferenceDirection}
            lat={city.lat}
            loading={climateLoading}
            failed={climateFailed}
            staggerClassName={staggerClassName}
            staggerStyle={staggerStyle}
          />
        )
      case 'gettingThere':
        return (
          <GettingThereTab
            country={city.country}
            staggerClassName={staggerClassName}
            staggerStyle={staggerStyle}
          />
        )
      case 'taxVisa':
        return (
          <TaxVisaTab
            country={city.country}
            staggerClassName={staggerClassName}
            staggerStyle={staggerStyle}
          />
        )
      case 'qol':
        return (
          <QualityOfLifeTab
            country={city.country}
            staggerClassName={staggerClassName}
            staggerStyle={staggerStyle}
          />
        )
      case 'peopleCulture':
        return (
          <PeopleAndCultureTab
            country={city.country}
            staggerClassName={staggerClassName}
            staggerStyle={staggerStyle}
          />
        )
      case 'expatLife':
        return (
          <ExpatLifeTab
            city={city.city}
            country={city.country}
            staggerClassName={staggerClassName}
            staggerStyle={staggerStyle}
          />
        )
      default:
        return null
    }
  })()

  return (
    <>
      <div className="wtr-city-detail__body">
        {mobileSheet ? (
          <CityDetailTabSelect
            variant="sheet"
            activeTab={activeTab}
            onChange={onActiveTabChange}
          />
        ) : (
          <nav
            className="wtr-city-detail__nav"
            role="tablist"
            aria-label="Destination details"
            aria-orientation="vertical"
          >
            {PANEL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={tab.tabId}
                aria-selected={activeTab === tab.id}
                aria-controls={tab.panelId}
                className={[
                  'wtr-city-detail__nav-item',
                  activeTab === tab.id && 'wtr-city-detail__nav-item--active',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onActiveTabChange(tab.id)}
              >
                <span className="wtr-city-detail__nav-label">{tab.label}</span>
              </button>
            ))}
          </nav>
        )}

        <AppOverlayScrollbars className="wtr-city-detail__tab-scroll" defer={false}>
          <div
            key={`${city.id}-${activeTab}`}
            id={activeTabMeta?.panelId}
            role={mobileSheet ? 'region' : 'tabpanel'}
            aria-label={
              mobileSheet
                ? `${activeTabMeta?.label ?? 'Section'} details`
                : undefined
            }
            aria-labelledby={mobileSheet ? undefined : activeTabMeta?.tabId}
            className="wtr-city-detail__tabpanel wtr-city-detail__tabpanel--enter"
          >
            {tabContent}
          </div>

          {mobileSheet && activeTab === 'peopleCulture' ? (
            <p className="wtr-city-detail__scroll-end-source">
              {DEMOGRAPHICS_TAB_SOURCE_FOOTER}
            </p>
          ) : null}
          {mobileSheet && listNav ? (
            <p className="wtr-city-detail__scroll-end-source">{PANEL_ESTIMATES_NOTE}</p>
          ) : null}
        </AppOverlayScrollbars>
      </div>

      <footer className="wtr-city-detail__footer">
        {activeTab === 'peopleCulture' && !mobileSheet ? (
          <p className="wtr-city-detail__footer-source">{DEMOGRAPHICS_TAB_SOURCE_FOOTER}</p>
        ) : null}
        {listNav ? (
          <WtrCityListPagination
            className="wtr-list-pagination--dest-panel"
            page={0}
            pageSize={1}
            totalCount={listNav.totalCount}
            onPageChange={() => {}}
            itemIndex={listNav.index}
            onItemPrev={listNav.onPrev}
            onItemNext={listNav.onNext}
            centerNote={mobileSheet ? undefined : PANEL_ESTIMATES_NOTE}
            showRange={false}
          />
        ) : null}
      </footer>
    </>
  )
}

export type CityDetailPanelProps = {
  scored: ScoredMapCity
  monthlyIncome: number
  mapFilters: Pick<MapFilters, 'includeHealthIns' | 'healthInsMonthlyUsd'>
  preferences: RetirementPreferences
  budgetBreakdown: BudgetBreakdownDisplay
  listNav: DestinationListNav | null
  mobileSheet: boolean
  onClose: () => void
}

/** Remounts when city.id changes so scroll content never stacks on prev/next navigation. */
export function CityDetailPanel({
  scored,
  monthlyIncome,
  mapFilters,
  preferences,
  budgetBreakdown,
  listNav,
  mobileSheet,
  onClose,
}: CityDetailPanelProps) {
  const { city } = scored
  const [activeTab, setActiveTab] = useState<CityDetailTab>('col')
  const { climate } = useCityClimate(scored.city)

  const panelMonthlyBudget = useMemo(
    () => monthlyBudgetForScoring(scored.city, mapFilters),
    [scored.city, mapFilters],
  )

  const headerScore = useMemo(
    () =>
      calculateRetirementScore(
        monthlyIncome,
        panelMonthlyBudget,
        scored.city,
        city.country,
        preferences,
        { climate },
      ),
    [monthlyIncome, panelMonthlyBudget, scored.city, city.country, preferences, climate],
  )

  const monthlySurplus = Math.max(0, monthlyIncome - panelMonthlyBudget)

  const headerProps = useMemo(
    () => ({
      cityName: city.city,
      country: city.country,
      panelMonthlyBudget,
      monthlySurplus,
      headerScore,
      onClose,
      showClose: !mobileSheet,
    }),
    [
      city.city,
      city.country,
      panelMonthlyBudget,
      monthlySurplus,
      headerScore,
      onClose,
      mobileSheet,
    ],
  )

  return (
    <div className="wtr-city-detail">
      <CityDetailPanelHeader {...headerProps} />
      <CityDetailPanelBody
        key={city.id}
        scored={scored}
        budgetBreakdown={budgetBreakdown}
        mobileSheet={mobileSheet}
        listNav={listNav}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        climatePreferenceStep={preferences.climate}
        climatePreferenceDirection={preferences.climatePreference}
      />
    </div>
  )
}
