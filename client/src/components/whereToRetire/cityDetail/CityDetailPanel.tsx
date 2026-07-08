import {
  useLayoutEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  AppOverlayScrollbars,
  APP_OVERLAY_SCROLLBARS_HORIZONTAL_OPTIONS,
} from "../../ui/AppOverlayScrollbars";
import { AppSelect } from "../../ui/AppSelect";
import { DetailPanelCard } from "../../ui/DetailPanelCard";
import { useRetirementExclusions } from "../../../hooks/useRetirementExclusions";
import {
  IconChartBar,
  IconCoins,
  IconFileText,
  IconPlane,
  IconSun,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useCityClimate } from "../../../hooks/useCityClimate";
import type {
  MapFilters,
  ScoredMapCity,
} from "../../../lib/whereToRetire/cityMapScoring";
import {
  DEFAULT_LIFESTYLE,
  monthlyBudgetForScoring,
} from "../../../lib/whereToRetire/cityMapScoring";
import type {
  PreferenceStep,
  RetirementPreferences,
} from "../../../types/preferences";
import type {
  BudgetBreakdownDisplay,
  LifestyleInputs,
} from "../../../utils/costOfLiving";
import { DEMOGRAPHICS_TAB_SOURCE_FOOTER } from "../../../utils/demographics";
import { EXPAT_TAB_SOURCE_FOOTER } from "../../../utils/expatInfo";
import {
  getQualityOfLifeData,
  QOL_WORLD_BANK_PROXY_NOTE,
} from "../../../utils/qualityOfLife";
import { getTaxVisaScopeLabel } from "../../../utils/taxVisa";
import { getCityClimateNormals } from "../../../utils/climateNormals";
import { calculateRetirementScore } from "../../../utils/retirementScore";
import type { DestinationListNav } from "../RetirementDestinationPanel";
import { WtrCityListPagination } from "../WtrCityListPagination";
import { CityDetailPanelHeader } from "./CityDetailPanelHeader";
import { CostOfLivingTab } from "./CostOfLivingTab";
import { ExpatLifeTab } from "./ExpatLifeTab";
import { GettingThereTab } from "./GettingThereTab";
import { PeopleAndCultureTab } from "./PeopleAndCultureTab";
import { QualityOfLifeTab } from "./QualityOfLifeTab";
import { TaxVisaTab } from "./TaxVisaTab";
import { WeatherTab } from "./WeatherTab";
import "./CityDetailPanel.scss";
import "./TaxVisaTab.scss";

export type CityDetailTab =
  | "col"
  | "weather"
  | "gettingThere"
  | "taxVisa"
  | "qol"
  | "peopleCulture"
  | "expatLife";

const PANEL_TABS: {
  id: CityDetailTab;
  label: string;
  tabId: string;
  panelId: string;
  icon: ReactNode;
}[] = [
  {
    id: "col",
    label: "Cost of living",
    tabId: "wtr-dest-tab-col",
    panelId: "wtr-dest-tabpanel-col",
    icon: <IconCoins size={16} stroke={1.5} />,
  },
  {
    id: "weather",
    label: "Weather",
    tabId: "wtr-dest-tab-weather",
    panelId: "wtr-dest-tabpanel-weather",
    icon: <IconSun size={16} stroke={1.5} />,
  },
  {
    id: "gettingThere",
    label: "Flights",
    tabId: "wtr-dest-tab-getting-there",
    panelId: "wtr-dest-tabpanel-getting-there",
    icon: <IconPlane size={16} stroke={1.5} />,
  },
  {
    id: "taxVisa",
    label: "Tax/visas",
    tabId: "wtr-dest-tab-tax-visa",
    panelId: "wtr-dest-tabpanel-tax-visa",
    icon: <IconFileText size={16} stroke={1.5} />,
  },
  {
    id: "qol",
    label: "Quality of life",
    tabId: "wtr-dest-tab-qol",
    panelId: "wtr-dest-tabpanel-qol",
    icon: <IconChartBar size={16} stroke={1.5} />,
  },
  {
    id: "peopleCulture",
    label: "Demographic",
    tabId: "wtr-dest-tab-people-culture",
    panelId: "wtr-dest-tabpanel-people-culture",
    icon: <IconUsers size={16} stroke={1.5} />,
  },
  {
    id: "expatLife",
    label: "Expats",
    tabId: "wtr-dest-tab-expat-life",
    panelId: "wtr-dest-tabpanel-expat-life",
    icon: <IconUsersGroup size={16} stroke={1.5} />,
  },
];

const PANEL_ESTIMATES_NOTE =
  "Estimates based on real prices reported by locals. Updated periodically. All amounts in USD.";

const WEATHER_TAB_SOURCE_NOTE =
  "Climate normals from Open-Meteo (1990–2020). Current weather may differ.";

function CityDetailTabSelect({
  activeTab,
  onChange,
  variant = "default",
}: {
  activeTab: CityDetailTab;
  onChange: (tab: CityDetailTab) => void;
  variant?: "default" | "sheet";
}) {
  const activeLabel =
    PANEL_TABS.find((tab) => tab.id === activeTab)?.label ?? "Section";

  if (variant === "sheet") {
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
    );
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
  );
}

type CityDetailPanelBodyProps = {
  scored: ScoredMapCity;
  planMonthlyIncome: number;
  budgetBreakdown: BudgetBreakdownDisplay;
  lifestyle: LifestyleInputs;
  mobileSheet: boolean;
  listNav: DestinationListNav | null;
  activeTab: CityDetailTab;
  onActiveTabChange: (tab: CityDetailTab) => void;
  climatePreferenceStep: PreferenceStep;
  climatePreferenceDirection: RetirementPreferences["climatePreference"];
  climateTempMinF: number;
  climateTempMaxF: number;
};

function CityDetailPanelBody({
  scored,
  planMonthlyIncome,
  budgetBreakdown,
  lifestyle,
  mobileSheet,
  listNav,
  activeTab,
  onActiveTabChange,
  climatePreferenceStep,
  climatePreferenceDirection,
  climateTempMinF,
  climateTempMaxF,
}: CityDetailPanelBodyProps) {
  const activeTabMeta = PANEL_TABS.find((t) => t.id === activeTab);
  const {
    climate,
    loading: climateLoading,
    failed: climateFailed,
  } = useCityClimate(scored.city);

  const { city } = scored;

  const taxVisaScopeNote = useMemo(
    () => getTaxVisaScopeLabel(city.country).text,
    [city.country],
  );

  const qolData = useMemo(
    () => getQualityOfLifeData(city.country),
    [city.country],
  );
  const qolUsesWorldBankProxy = qolData?.source === "world_bank_proxy";

  const paginationCenterNote =
    activeTab === "taxVisa"
      ? taxVisaScopeNote
      : activeTab === "weather"
        ? WEATHER_TAB_SOURCE_NOTE
        : activeTab === "expatLife"
          ? EXPAT_TAB_SOURCE_FOOTER
          : activeTab === "peopleCulture"
            ? DEMOGRAPHICS_TAB_SOURCE_FOOTER
            : activeTab === "qol" && qolUsesWorldBankProxy
              ? QOL_WORLD_BANK_PROXY_NOTE
              : mobileSheet
                ? undefined
                : PANEL_ESTIMATES_NOTE;

  const tabKey = `${city.id}-${activeTab}`;
  const [fadedTabKey, setFadedTabKey] = useState<CityDetailTab | null>(null);

  useLayoutEffect(() => {
    setFadedTabKey(null);
    const id = requestAnimationFrame(() => setFadedTabKey(activeTab));
    return () => cancelAnimationFrame(id);
  }, [activeTab]);

  const tabFadeIn = fadedTabKey === activeTab;

  const tabContent = (() => {
    switch (activeTab) {
      case "col":
        return (
          <CostOfLivingTab
            city={scored.city}
            planMonthlyIncome={planMonthlyIncome}
            budgetBreakdown={budgetBreakdown}
            lifestyle={lifestyle}
          />
        );
      case "weather":
        return (
          <WeatherTab
            cityId={city.id}
            climate={climate}
            climatePreferenceStep={climatePreferenceStep}
            climatePreferenceDirection={climatePreferenceDirection}
            climateTempMinF={climateTempMinF}
            climateTempMaxF={climateTempMaxF}
            lat={city.lat}
            loading={climateLoading}
            failed={climateFailed}
          />
        );
      case "gettingThere":
        return <GettingThereTab country={city.country} />;
      case "taxVisa":
        return <TaxVisaTab country={city.country} />;
      case "qol":
        return <QualityOfLifeTab country={city.country} />;
      case "peopleCulture":
        return <PeopleAndCultureTab city={city.city} country={city.country} />;
      case "expatLife":
        return <ExpatLifeTab city={city.city} country={city.country} />;
      default:
        return null;
    }
  })();

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
          <AppOverlayScrollbars
            className="wtr-city-detail__nav-scroll"
            defer={false}
            options={APP_OVERLAY_SCROLLBARS_HORIZONTAL_OPTIONS}
          >
            <nav
              className="wtr-city-detail__nav"
              role="tablist"
              aria-label="Destination details"
              aria-orientation="horizontal"
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
                    "wtr-city-detail__nav-item",
                    activeTab === tab.id && "wtr-city-detail__nav-item--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onActiveTabChange(tab.id)}
                >
                  <span className="wtr-city-detail__nav-label">{tab.label}</span>
                </button>
              ))}
            </nav>
          </AppOverlayScrollbars>
        )}

        <AppOverlayScrollbars
          className="wtr-city-detail__tab-scroll"
          defer={false}
        >
          <div
            id={activeTabMeta?.panelId}
            role={mobileSheet ? "region" : "tabpanel"}
            aria-label={
              mobileSheet
                ? `${activeTabMeta?.label ?? "Section"} details`
                : undefined
            }
            aria-labelledby={mobileSheet ? undefined : activeTabMeta?.tabId}
            className="wtr-city-detail__tabpanel"
          >
            <div
              key={tabKey}
              className={[
                "wtr-city-detail__tab-fade",
                tabFadeIn && "wtr-city-detail__tab-fade--in",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <DetailPanelCard className="wtr-city-detail__tab-card">
                <h3 className="sr-only">{activeTabMeta?.label ?? "Section"}</h3>
                {tabContent}
              </DetailPanelCard>
            </div>
          </div>

          {mobileSheet &&
          listNav &&
          activeTab !== "taxVisa" &&
          activeTab !== "weather" &&
          activeTab !== "expatLife" &&
          activeTab !== "peopleCulture" &&
          !(activeTab === "qol" && qolUsesWorldBankProxy) ? (
            <p className="wtr-city-detail__scroll-end-source">
              {PANEL_ESTIMATES_NOTE}
            </p>
          ) : null}
        </AppOverlayScrollbars>
      </div>

      <footer className="wtr-city-detail__footer">
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
            centerNote={paginationCenterNote}
            showRange={false}
          />
        ) : null}
      </footer>
    </>
  );
}

export type CityDetailPanelProps = {
  scored: ScoredMapCity;
  monthlyIncome: number;
  planMonthlyIncome: number;
  mapFilters: Pick<MapFilters, "lifestyle">;
  preferences: RetirementPreferences;
  budgetBreakdown: BudgetBreakdownDisplay;
  listNav: DestinationListNav | null;
  mobileSheet: boolean;
  onClose: () => void;
};

/** Remounts when city.id changes so scroll content never stacks on prev/next navigation. */
export function CityDetailPanel({
  scored,
  monthlyIncome,
  planMonthlyIncome,
  mapFilters,
  preferences,
  budgetBreakdown,
  listNav,
  mobileSheet,
  onClose,
}: CityDetailPanelProps) {
  const { city } = scored;
  const [activeTab, setActiveTab] = useState<CityDetailTab>("col");
  const { excludedCountries, addExcludedCountry } = useRetirementExclusions();
  const countryExcluded = excludedCountries.includes(city.country);

  const panelMonthlyBudget = useMemo(
    () =>
      monthlyBudgetForScoring(
        scored.city,
        mapFilters.lifestyle ?? DEFAULT_LIFESTYLE,
      ),
    [scored.city, mapFilters.lifestyle],
  );

  const headerClimateNormals = useMemo(
    () => getCityClimateNormals(city.city, city.country),
    [city.city, city.country],
  );

  const headerScore = useMemo(
    () =>
      calculateRetirementScore(
        monthlyIncome,
        panelMonthlyBudget,
        scored.city,
        city.country,
        preferences,
        { climate: headerClimateNormals },
      ),
    [
      monthlyIncome,
      panelMonthlyBudget,
      scored.city,
      city.country,
      preferences,
      headerClimateNormals,
    ],
  );

  const monthlySurplus = Math.max(0, monthlyIncome - panelMonthlyBudget);

  const onExcludeCountry = useCallback(() => {
    if (!countryExcluded) {
      addExcludedCountry(city.country);
      onClose();
    }
  }, [addExcludedCountry, city.country, countryExcluded, onClose]);

  const headerProps = useMemo(
    () => ({
      cityName: city.city,
      country: city.country,
      panelMonthlyBudget,
      monthlySurplus,
      headerScore,
      onClose,
      showClose: !mobileSheet,
      onExcludeCountry,
      countryExcluded,
    }),
    [
      city.city,
      city.country,
      panelMonthlyBudget,
      monthlySurplus,
      headerScore,
      onClose,
      mobileSheet,
      onExcludeCountry,
      countryExcluded,
    ],
  );

  return (
    <div className="wtr-city-detail">
      <CityDetailPanelHeader {...headerProps} />
      <CityDetailPanelBody
        key={city.id}
        scored={scored}
        planMonthlyIncome={planMonthlyIncome}
        budgetBreakdown={budgetBreakdown}
        lifestyle={mapFilters.lifestyle ?? DEFAULT_LIFESTYLE}
        mobileSheet={mobileSheet}
        listNav={listNav}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        climatePreferenceStep={preferences.climate}
        climatePreferenceDirection={preferences.climatePreference}
        climateTempMinF={preferences.climateTempMinF}
        climateTempMaxF={preferences.climateTempMaxF}
      />
    </div>
  );
}
