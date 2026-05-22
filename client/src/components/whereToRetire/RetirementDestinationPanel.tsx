import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { Label, ListBox, Select } from "@heroui/react";
import {
  IconBarbell,
  IconBolt,
  IconBus,
  IconChartBar,
  IconCoins,
  IconFileText,
  IconHome,
  IconMovie,
  IconPlane,
  IconSun,
  IconToolsKitchen2,
  IconUsers,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";
import { firstKeyFromSelectSelection } from "../../lib/dateOfBirthSelect";
import { WtrCompareToggleButton } from "./WtrCompareToggleButton";
import { WtrExcludeCountryIcon } from "./WtrExcludeCountryIcon";
import { useCityClimate } from "../../hooks/useCityClimate";
import type { ScoredMapCity } from "../../lib/whereToRetire/cityMapScoring";
import { calculateRetirementScore } from "../../utils/retirementScore";
import type { CityData } from "../../utils/costOfLiving";
import {
  buildBudgetBreakdownDisplay,
  calculateMonthlyBudget,
  countryToFlagEmoji,
  formatUsd,
  formatUsdOrDash,
  getMonthlyBudgetComponents,
  hasTravelAdvisory,
} from "../../utils/costOfLiving";
import { TravelAdvisoryNotice } from "./TravelAdvisoryNotice";
import {
  formatGasolineDualPrice,
  monthlyFoodEstimate,
  rentCardHeaderSubtitle,
} from "../../utils/units";
import { ClimateCard } from "./ClimateCard";
import { ColBudgetBreakdownBar } from "./ColBudgetBreakdownBar";
import {
  ColCategoryCard,
  COL_CATEGORY_ICON_SIZE,
  formatColCategoryAmount,
  type ColCategoryCardProps,
} from "./ColCategoryCard";
import { ColExtrasList, type ColExtraLineItem } from "./ColExtrasList";
import { DestinationGettingThereTab } from "./DestinationGettingThereTab";
import { DestinationExchangeRate } from "./DestinationExchangeRate";
import { DestinationExpatLifeTab } from "./DestinationExpatLifeTab";
import { DestinationPeopleCultureTab } from "./DestinationPeopleCultureTab";
import { DestinationQualityOfLifeTab } from "./DestinationQualityOfLifeTab";
import { DestinationTaxVisaTab } from "./DestinationTaxVisaTab";
import { RetirementScoreHeader } from "./RetirementScoreHeader";
import { WtrCityListPagination } from "./WtrCityListPagination";
import "./ClimateCard.scss";
import "./ColBudgetBreakdownBar.scss";
import "./ColCategoryCard.scss";
import "./ColExtrasList.scss";
import "./DestinationGettingThereTab.scss";
import "./DestinationExpatLifeTab.scss";
import "./DestinationPeopleCultureTab.scss";
import "./DestinationQualityOfLifeTab.scss";
import "./RetirementDestinationPanel.scss";
import "./WtrCityListPagination.scss";

export type DestinationListPageNav = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

type Props = {
  scored: ScoredMapCity | null;
  monthlyIncome: number;
  open: boolean;
  onClose: () => void;
  compareSelected: boolean;
  compareAtMax: boolean;
  onToggleCompare: () => void;
  isCountryExcluded?: boolean;
  onExcludeCountry?: () => void;
  listPageNav: DestinationListPageNav | null;
};

type PanelTab =
  | "col"
  | "weather"
  | "gettingThere"
  | "taxVisa"
  | "qol"
  | "peopleCulture"
  | "expatLife";

function panelStaggerStyle(index: number): CSSProperties {
  return { "--wtr-panel-i": index } as CSSProperties;
}

const PANEL_TABS: {
  id: PanelTab;
  label: string;
  tabId: string;
  panelId: string;
  icon: ReactNode;
}[] = [
  {
    id: "col",
    label: "Cost of Living",
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
    label: "Getting There",
    tabId: "wtr-dest-tab-getting-there",
    panelId: "wtr-dest-tabpanel-getting-there",
    icon: <IconPlane size={16} stroke={1.5} />,
  },
  {
    id: "taxVisa",
    label: "Tax & Visa",
    tabId: "wtr-dest-tab-tax-visa",
    panelId: "wtr-dest-tabpanel-tax-visa",
    icon: <IconFileText size={16} stroke={1.5} />,
  },
  {
    id: "qol",
    label: "Quality of Life",
    tabId: "wtr-dest-tab-qol",
    panelId: "wtr-dest-tabpanel-qol",
    icon: <IconChartBar size={16} stroke={1.5} />,
  },
  {
    id: "peopleCulture",
    label: "People & Culture",
    tabId: "wtr-dest-tab-people-culture",
    panelId: "wtr-dest-tabpanel-people-culture",
    icon: <IconUsers size={16} stroke={1.5} />,
  },
  {
    id: "expatLife",
    label: "Expat Life",
    tabId: "wtr-dest-tab-expat-life",
    panelId: "wtr-dest-tabpanel-expat-life",
    icon: <IconUsersGroup size={16} stroke={1.5} />,
  },
];

const PANEL_MOBILE_NAV_MQ = "(max-width: 680px)";

function usePanelMobileNav(): boolean {
  const [mobileNav, setMobileNav] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(PANEL_MOBILE_NAV_MQ).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(PANEL_MOBILE_NAV_MQ);
    const onChange = () => setMobileNav(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mobileNav;
}

function DestinationPanelTabSelect({
  activeTab,
  onChange,
}: {
  activeTab: PanelTab;
  onChange: (tab: PanelTab) => void;
}) {
  return (
    <Select
      className="wtr-dest-panel__tab-select"
      variant="secondary"
      aria-label="Destination section"
      selectedKey={activeTab}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys);
        if (!id) return;
        onChange(id as PanelTab);
      }}
    >
      <Label className="wtr-dest-panel__tab-select-label">Section</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="wtr-dest-panel__tab-select-popover">
        <ListBox>
          {PANEL_TABS.map((tab) => (
            <ListBox.Item key={tab.id} id={tab.id} textValue={tab.label}>
              {tab.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

type ColCategoryPanelCard = ColCategoryCardProps & { id: string };

const COL_EXTRA_ICON_SIZE = 18;

function buildColBudgetCards(city: CityData): ColCategoryPanelCard[] {
  const components = getMonthlyBudgetComponents(city);
  const icon = COL_CATEGORY_ICON_SIZE;

  return [
    {
      id: "food",
      variant: "hero",
      title: "Food",
      icon: <IconToolsKitchen2 size={icon} stroke={1.5} aria-hidden />,
      headerSubtitle: "Average Monthly",
      headerAmount: formatColCategoryAmount(
        monthlyFoodEstimate(city.meal_inexpensive_restaurant),
      ),
      panelTitle: "Example Prices",
      rows: [
        {
          label: "Inexpensive meal",
          value: formatUsdOrDash(city.meal_inexpensive_restaurant),
        },
        { label: "McMeal at McDonald's", value: formatUsdOrDash(city.mcmeal) },
        { label: "Cappuccino", value: formatUsdOrDash(city.cappuccino) },
        {
          label: "Beer (draft)",
          value: formatUsdOrDash(city.domestic_beer_draught),
        },
        {
          label: "Beer (bottle)",
          value: formatUsdOrDash(city.imported_beer_bottle),
        },
        {
          label: "Wine (mid-range)",
          value: formatUsdOrDash(city.wine_bottle_midrange),
        },
        {
          label: "Dinner for 2",
          value: formatUsdOrDash(city.meal_midrange_restaurant_for2),
          note: "Three courses, no drinks",
        },
      ],
      footerPill: (
        <>
          Based on 45 <strong>inexpensive</strong> meals/mo
        </>
      ),
    },
    {
      id: "rent",
      variant: "hero",
      title: "Rent",
      icon: <IconHome size={icon} stroke={1.5} aria-hidden />,
      headerSubtitle: rentCardHeaderSubtitle(),
      headerAmount: formatColCategoryAmount(city.rent_1br_outside_centre),
      rows: [
        {
          label: "1BR (city center)",
          value: formatUsdOrDash(city.rent_1br_city_centre),
        },
        {
          label: "3BR (outside center)",
          value: formatUsdOrDash(city.rent_3br_outside_centre),
        },
      ],
      footerPill: "City center is always more expensive",
    },
    {
      id: "utilities-internet",
      variant: "hero",
      title: "Utilities",
      icon: <IconBolt size={icon} stroke={1.5} aria-hidden />,
      headerSubtitle: "plus internet",
      headerAmount: formatColCategoryAmount(components.utilitiesInternet),
      panelTitle: "Includes",
      rows: [
        { label: "Broadband (60 Mbps)" },
        { label: "Electricity usage" },
        { label: "Water" },
        { label: "Heating" },
      ],
    },
    {
      id: "transport",
      variant: "hero",
      title: "Transportation",
      icon: <IconBus size={icon} stroke={1.5} aria-hidden />,
      rows: [
        {
          label: "Gallon/Liter of gas",
          value: formatGasolineDualPrice(city.gasoline_1L),
        },
        {
          label: "Monthly transit pass",
          value: formatUsdOrDash(city.transport_monthly_pass),
        },
      ],
    },
  ];
}

function ColCategoryPanelSection({
  card,
  staggerIndex,
}: {
  card: ColCategoryPanelCard;
  staggerIndex: number;
}) {
  const { id: _id, ...categoryProps } = card;
  return (
    <ColCategoryCard
      {...categoryProps}
      className="wtr-dest-panel__stagger-item"
      style={panelStaggerStyle(staggerIndex)}
    />
  );
}

function buildColSupplementalItems(city: CityData): ColExtraLineItem[] {
  const icon = COL_EXTRA_ICON_SIZE;
  return [
    {
      id: "gym",
      label: "Gym membership",
      value: formatUsdOrDash(city.gym_monthly),
      note: "Monthly, one adult",
      icon: <IconBarbell size={icon} stroke={1.5} aria-hidden />,
    },
    {
      id: "leisure",
      label: "Leisure",
      value: formatUsdOrDash(city.cinema_ticket),
      note: "Cinema ticket",
      icon: <IconMovie size={icon} stroke={1.5} aria-hidden />,
    },
  ];
}

type CityViewProps = {
  scored: ScoredMapCity;
  monthlyIncome: number;
  budgetBreakdown: NonNullable<ReturnType<typeof buildBudgetBreakdownDisplay>>;
  isCountryExcluded?: boolean;
  onExcludeCountry?: () => void;
  listPageNav: DestinationListPageNav | null;
};

/** Remounts when city.id changes so scroll content never stacks on prev/next navigation. */
function DestinationPanelCityView({
  scored,
  monthlyIncome,
  budgetBreakdown,
  isCountryExcluded = false,
  onExcludeCountry,
  listPageNav,
}: CityViewProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("col");
  const mobileNav = usePanelMobileNav();
  const activeTabMeta = PANEL_TABS.find((t) => t.id === activeTab);
  const {
    climate,
    loading: climateLoading,
    failed: climateFailed,
  } = useCityClimate(scored.city);

  const { city } = scored;

  const panelMonthlyBudget = useMemo(
    () => calculateMonthlyBudget(city),
    [city],
  );

  const headerScore = useMemo(
    () =>
      calculateRetirementScore(
        monthlyIncome,
        panelMonthlyBudget,
        null,
        city.country,
      ),
    [monthlyIncome, panelMonthlyBudget, city.country],
  );

  const monthlySurplus = Math.max(
    0,
    Math.round(monthlyIncome - panelMonthlyBudget),
  );
  const flagEmoji = countryToFlagEmoji(city.country);
  const colBudgetCards = buildColBudgetCards(city);
  const colSupplementalItems = buildColSupplementalItems(city);
  const showTravelAdvisory = hasTravelAdvisory(city.country);

  return (
    <div className="wtr-dest-panel__layout">
      <header className="wtr-dest-panel__sticky-head">
        <div
          className="wtr-dest-panel__header wtr-dest-panel__stagger-item"
          style={panelStaggerStyle(0)}
        >
          <div className="wtr-dest-panel__title-row">
            <span className="wtr-dest-panel__flag" aria-hidden>
              {flagEmoji}
            </span>
            <div className="wtr-dest-panel__titles">
              <h2 id="wtr-dest-panel-title" className="wtr-dest-panel__name">
                {city.city}
              </h2>
              <div className="wtr-dest-panel__country-row">
                <p className="wtr-dest-panel__country">{city.country}</p>
                {onExcludeCountry && !isCountryExcluded ? (
                  <WtrExcludeCountryIcon
                    country={city.country}
                    onExclude={onExcludeCountry}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <section
          className="wtr-dest-panel__summary"
          aria-label="Monthly budget and retirement score"
        >
          <div className="wtr-dest-panel__summary-budget">
            <p className="wtr-dest-panel__summary-total tabular-nums">
              {formatUsd(panelMonthlyBudget)}
            </p>
            {monthlySurplus > 0 ? (
              <>
                <hr className="wtr-dest-panel__summary-divider" />
                <p className="wtr-dest-panel__summary-surplus tabular-nums">
                  + {formatUsd(monthlySurplus)} surplus
                </p>
              </>
            ) : null}
          </div>
          <RetirementScoreHeader
            className="wtr-dest-panel__summary-score"
            displayScore={headerScore.displayScore}
            incomeFitScore={headerScore.incomeFitScore}
            qolNormalized={headerScore.qolNormalized}
            warnings={headerScore.warnings}
            band={headerScore.band}
            bandColor={headerScore.bandColor}
            bandLabel={headerScore.bandLabel}
          />
        </section>
      </header>

      <div className="wtr-dest-panel__scroll">
        {mobileNav ? (
          <div
            className="wtr-dest-panel__tab-nav wtr-dest-panel__stagger-item"
            style={panelStaggerStyle(2)}
          >
            <DestinationPanelTabSelect
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
        ) : (
          <div
            className="wtr-dest-panel__tabs wtr-dest-panel__stagger-item"
            style={panelStaggerStyle(2)}
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
                className={`wtr-dest-panel__tab${activeTab === tab.id ? " wtr-dest-panel__tab--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="wtr-dest-panel__tab-inner">
                  <span className="wtr-dest-panel__tab-label">{tab.label}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <SimpleBar className="wtr-dest-panel__tab-content" autoHide={false}>
          <div className="wtr-dest-panel__body">
            <div
              key={`${city.id}-${activeTab}`}
              id={activeTabMeta?.panelId}
              role={mobileNav ? "region" : "tabpanel"}
              aria-label={
                mobileNav
                  ? `${activeTabMeta?.label ?? "Section"} details`
                  : undefined
              }
              aria-labelledby={mobileNav ? undefined : activeTabMeta?.tabId}
              className="wtr-dest-panel__tabpanel wtr-dest-panel__tabpanel--enter"
            >
              {activeTab === "col" ? (
                <>
                  <DestinationExchangeRate
                    city={city}
                    staggerClassName="wtr-dest-panel__stagger-item"
                    staggerStyle={panelStaggerStyle}
                  />
                  <div className="wtr-dest-panel__col-stack">
                    <div className="wtr-dest-panel__cards wtr-dest-panel__cards--budget">
                      {colBudgetCards.map((card, index) => (
                        <ColCategoryPanelSection
                          key={card.id}
                          card={card}
                          staggerIndex={index}
                        />
                      ))}
                    </div>
                    <div className="wtr-dest-panel__col-extras">
                      <p
                        className="wtr-dest-panel__col-extras-note wtr-dest-panel__stagger-item"
                        style={panelStaggerStyle(colBudgetCards.length)}
                      >
                        Optional lifestyle costs
                      </p>
                      <ColExtrasList
                        items={colSupplementalItems}
                        className="wtr-dest-panel__stagger-item"
                        style={panelStaggerStyle(colBudgetCards.length + 1)}
                      />
                    </div>
                  </div>
                  {showTravelAdvisory ? (
                    <div
                      className="wtr-dest-panel__stagger-item"
                      style={panelStaggerStyle(colBudgetCards.length + 2)}
                    >
                      <TravelAdvisoryNotice />
                    </div>
                  ) : null}
                </>
              ) : activeTab === "weather" ? (
                <div className="wtr-dest-panel__weather">
                  <ClimateCard
                    climate={climate}
                    loading={climateLoading}
                    failed={climateFailed}
                    staggerClassName="wtr-dest-panel__stagger-item"
                    staggerStyle={panelStaggerStyle}
                  />
                </div>
              ) : activeTab === "gettingThere" ? (
                <DestinationGettingThereTab
                  country={city.country}
                  staggerClassName="wtr-dest-panel__stagger-item"
                  staggerStyle={panelStaggerStyle}
                />
              ) : activeTab === "taxVisa" ? (
                <DestinationTaxVisaTab
                  country={city.country}
                  staggerClassName="wtr-dest-panel__stagger-item"
                  staggerStyle={panelStaggerStyle}
                />
              ) : activeTab === "qol" ? (
                <DestinationQualityOfLifeTab
                  country={city.country}
                  staggerClassName="wtr-dest-panel__stagger-item"
                  staggerStyle={panelStaggerStyle}
                />
              ) : activeTab === "peopleCulture" ? (
                <DestinationPeopleCultureTab
                  country={city.country}
                  staggerClassName="wtr-dest-panel__stagger-item"
                  staggerStyle={panelStaggerStyle}
                />
              ) : (
                <DestinationExpatLifeTab
                  city={city.city}
                  country={city.country}
                  staggerClassName="wtr-dest-panel__stagger-item"
                  staggerStyle={panelStaggerStyle}
                />
              )}
            </div>
          </div>
        </SimpleBar>
      </div>

      <footer className="wtr-dest-panel__footer">
        {activeTab === "col" ? (
          <ColBudgetBreakdownBar breakdown={budgetBreakdown} />
        ) : null}
        {listPageNav ? (
          <WtrCityListPagination
            className="wtr-list-pagination--dest-panel"
            page={listPageNav.page}
            pageSize={listPageNav.pageSize}
            totalCount={listPageNav.totalCount}
            onPageChange={listPageNav.onPageChange}
            centerNote="Estimates based on real prices reported by locals. Updated periodically. All amounts in USD."
          />
        ) : null}
      </footer>
    </div>
  );
}

export function RetirementDestinationPanel({
  scored,
  monthlyIncome,
  open,
  onClose,
  compareSelected,
  compareAtMax,
  onToggleCompare,
  isCountryExcluded = false,
  onExcludeCountry,
  listPageNav,
}: Props) {
  const [slideOpen, setSlideOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setSlideOpen(false);
      return;
    }
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => setSlideOpen(true));
    });
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const budgetBreakdown = useMemo(
    () => (scored ? buildBudgetBreakdownDisplay(scored.city) : null),
    [scored],
  );

  if (!scored || !budgetBreakdown) return null;

  return (
    <aside
      className={`wtr-dest-panel${slideOpen ? " wtr-dest-panel--open" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-hidden={!open}
      aria-labelledby="wtr-dest-panel-title"
    >
      <div className="wtr-dest-panel__actions">
        <WtrCompareToggleButton
          className="wtr-compare-corner--panel"
          selected={compareSelected}
          atMax={compareAtMax}
          cityName={scored.city.city}
          onToggle={onToggleCompare}
        />
        <button
          type="button"
          className="wtr-dest-panel__close"
          aria-label="Close destination details"
          onClick={onClose}
        >
          <IconX size={18} stroke={1.5} aria-hidden />
        </button>
      </div>
      <DestinationPanelCityView
        key={scored.city.id}
        scored={scored}
        monthlyIncome={monthlyIncome}
        budgetBreakdown={budgetBreakdown}
        isCountryExcluded={isCountryExcluded}
        onExcludeCountry={onExcludeCountry}
        listPageNav={listPageNav}
      />
    </aside>
  );
}
