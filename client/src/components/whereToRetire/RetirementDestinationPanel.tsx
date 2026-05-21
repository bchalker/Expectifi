import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { useWtrPageScrollLock } from "../../hooks/useWtrPageScrollLock";
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
} from "@tabler/icons-react";
import { WtrCompareToggleButton } from "./WtrCompareToggleButton";
import { useCityClimate } from "../../hooks/useCityClimate";
import type { ScoredMapCity } from "../../lib/whereToRetire/cityMapScoring";
import { matchTier } from "../../lib/whereToRetire/cityMapScoring";
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
  foodCardEstimateLines,
  formatGasolineHeroValue,
  rentCardEstimateLines,
  utilitiesCardEstimateLines,
} from "../../utils/units";
import { ClimateCard } from "./ClimateCard";
import { ColBudgetBreakdownBar } from "./ColBudgetBreakdownBar";
import {
  ColCategoryCard,
  COL_CATEGORY_ICON_SIZE,
  type ColCategoryCardProps,
} from "./ColCategoryCard";
import { DestinationGettingThereTab } from "./DestinationGettingThereTab";
import { DestinationPeopleCultureTab } from "./DestinationPeopleCultureTab";
import { DestinationQualityOfLifeTab } from "./DestinationQualityOfLifeTab";
import { DestinationTaxVisaTab } from "./DestinationTaxVisaTab";
import { FitGauge } from "./FitGauge";
import { WtrCityListPagination } from "./WtrCityListPagination";
import "./ClimateCard.scss";
import "./ColBudgetBreakdownBar.scss";
import "./ColCategoryCard.scss";
import "./DestinationGettingThereTab.scss";
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
  listPageNav: DestinationListPageNav | null;
};

type PanelTab =
  | "col"
  | "weather"
  | "gettingThere"
  | "taxVisa"
  | "qol"
  | "peopleCulture";

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
];

type StatCard = {
  kind: "stat";
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
};

type ColCategoryPanelCard = ColCategoryCardProps & { id: string };

type PanelCard = ColCategoryPanelCard | StatCard;

function isStatCard(card: PanelCard): card is StatCard {
  return "kind" in card && card.kind === "stat";
}

const STAT_ICON_SIZE = 24;

function buildColBudgetCards(city: CityData): ColCategoryPanelCard[] {
  const components = getMonthlyBudgetComponents(city);
  const icon = COL_CATEGORY_ICON_SIZE;

  return [
    {
      id: "rent",
      variant: "hero",
      title: "Rent",
      icon: <IconHome size={icon} stroke={1.5} aria-hidden />,
      monthlyEstimate: city.rent_1br_outside_centre,
      estimateLines: rentCardEstimateLines(),
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
    },
    {
      id: "food",
      variant: "hero",
      title: "Food",
      icon: <IconToolsKitchen2 size={icon} stroke={1.5} aria-hidden />,
      monthlyEstimate: Math.round(components.food),
      estimateLines: foodCardEstimateLines(),
      rows: [
        {
          label: "Inexpensive restaurant meal",
          value: formatUsdOrDash(city.meal_inexpensive_restaurant),
        },
        { label: "McMeal at McDonald's", value: formatUsdOrDash(city.mcmeal) },
        { label: "Cappuccino", value: formatUsdOrDash(city.cappuccino) },
        {
          label: "Domestic beer (draft)",
          value: formatUsdOrDash(city.domestic_beer_draught),
        },
        {
          label: "Imported beer (bottle)",
          value: formatUsdOrDash(city.imported_beer_bottle),
        },
        {
          label: "Wine (mid-range bottle)",
          value: formatUsdOrDash(city.wine_bottle_midrange),
        },
      ],
      footerRow: {
        label: "Mid-range dinner for 2",
        value: formatUsdOrDash(city.meal_midrange_restaurant_for2),
        note: "Three courses, no drinks",
      },
    },
    {
      id: "transport",
      variant: "hero",
      title: "Transport",
      icon: <IconBus size={icon} stroke={1.5} aria-hidden />,
      heroValue: formatGasolineHeroValue(city.gasoline_1L),
      heroUnit: "gallon (liter)",
      rows: [
        {
          label: "Monthly transit pass",
          value: formatUsdOrDash(city.transport_monthly_pass),
        },
      ],
    },
    {
      id: "utilities-internet",
      variant: "hero",
      title: "Utilities and Internet",
      icon: <IconBolt size={icon} stroke={1.5} aria-hidden />,
      monthlyEstimate: components.utilitiesInternet,
      estimateLines: utilitiesCardEstimateLines(),
      rows: [
        {
          label: "Utilities (monthly)",
          value: formatUsdOrDash(city.utilities_monthly_85m2),
        },
        {
          label: "Broadband (60 Mbps)",
          value: formatUsdOrDash(city.internet_60mbps_monthly),
        },
      ],
    },
  ];
}

function buildColSupplementalCards(city: CityData): StatCard[] {
  return [
    {
      kind: "stat",
      id: "gym",
      label: "Gym membership",
      value: formatUsdOrDash(city.gym_monthly),
      subtitle: "Monthly, one adult",
      icon: <IconBarbell size={STAT_ICON_SIZE} stroke={1.5} aria-hidden />,
    },
    {
      kind: "stat",
      id: "leisure",
      label: "Leisure",
      value: formatUsdOrDash(city.cinema_ticket),
      subtitle: "Cinema ticket",
      icon: <IconMovie size={STAT_ICON_SIZE} stroke={1.5} aria-hidden />,
    },
  ];
}

function StatCardSection({
  card,
  className,
  style,
}: {
  card: StatCard;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <article
      className={[
        "wtr-dest-panel__card",
        "wtr-dest-panel__card--stat",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <span className="wtr-dest-panel__card-icon-top">{card.icon}</span>
      <p className="wtr-dest-panel__stat-label">{card.label}</p>
      <p className="wtr-dest-panel__stat-value">{card.value}</p>
      {card.subtitle ? (
        <p className="wtr-dest-panel__card-subtitle wtr-dest-panel__card-subtitle--centered">
          {card.subtitle}
        </p>
      ) : null}
    </article>
  );
}

function ColPanelCardSection({
  card,
  staggerIndex,
}: {
  card: PanelCard;
  staggerIndex: number;
}) {
  const staggerClass = "wtr-dest-panel__stagger-item";
  const staggerStyle = panelStaggerStyle(staggerIndex);
  if (isStatCard(card)) {
    return (
      <StatCardSection
        card={card}
        className={staggerClass}
        style={staggerStyle}
      />
    );
  }
  const { id: _id, ...categoryProps } = card;
  return (
    <ColCategoryCard
      {...categoryProps}
      className={staggerClass}
      style={staggerStyle}
    />
  );
}

type CityViewProps = {
  scored: ScoredMapCity;
  monthlyIncome: number;
  budgetBreakdown: NonNullable<ReturnType<typeof buildBudgetBreakdownDisplay>>;
  compareSelected: boolean;
  compareAtMax: boolean;
  onToggleCompare: () => void;
  listPageNav: DestinationListPageNav | null;
};

/** Remounts when city.id changes so scroll content never stacks on prev/next navigation. */
function DestinationPanelCityView({
  scored,
  monthlyIncome,
  budgetBreakdown,
  compareSelected,
  compareAtMax,
  onToggleCompare,
  listPageNav,
}: CityViewProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("col");
  const {
    climate,
    loading: climateLoading,
    failed: climateFailed,
  } = useCityClimate(scored.city);

  const { city, affordabilityScore, colExplanation } = scored;
  const panelMonthlyBudget = calculateMonthlyBudget(city);
  const monthlySurplus = Math.max(
    0,
    Math.round(monthlyIncome - panelMonthlyBudget),
  );
  const tier = matchTier(affordabilityScore);
  const flagEmoji = countryToFlagEmoji(city.country);
  const colBudgetCards = buildColBudgetCards(city);
  const colSupplementalCards = buildColSupplementalCards(city);
  const showTravelAdvisory = hasTravelAdvisory(city.country);

  return (
    <>
      <WtrCompareToggleButton
        className="wtr-compare-corner--panel"
        selected={compareSelected}
        atMax={compareAtMax}
        cityName={city.city}
        onToggle={onToggleCompare}
      />
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
                <p className="wtr-dest-panel__country">{city.country}</p>
              </div>
            </div>
          </div>

          <section
            className="wtr-dest-panel__summary"
            aria-label="Monthly budget estimate"
          >
            <div className="wtr-dest-panel__summary-total-block">
              <p className="wtr-dest-panel__summary-total">
                {formatUsd(panelMonthlyBudget)}
                <span className="wtr-dest-panel__summary-total-suffix">
                  /mo
                </span>
              </p>
              {monthlySurplus > 0 ? (
                <span className="wtr-dest-panel__summary-surplus">
                  + {formatUsd(monthlySurplus)} surplus
                </span>
              ) : null}
            </div>
            <div className="wtr-dest-panel__summary-copy">
              <FitGauge
                className="wtr-dest-panel__summary-gauge"
                label="Retirement income fit score"
                score={affordabilityScore}
                tier={tier}
              />
              <p className="wtr-dest-panel__summary-note">
                Single-person estimate based on rent outside city center, food,
                transport, utilities, and internet.{" "}
                <strong>{colExplanation}</strong>
              </p>
            </div>
          </section>
        </header>

        <div className="wtr-dest-panel__scroll">
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
                  {/* <span className="wtr-dest-panel__tab-icon" aria-hidden>
                    {tab.icon}
                  </span> */}
                  <span className="wtr-dest-panel__tab-label">{tab.label}</span>
                </span>
              </button>
            ))}
          </div>

          <SimpleBar className="wtr-dest-panel__tab-content" autoHide={false}>
            <div className="wtr-dest-panel__body">
              <div
                key={`${city.id}-${activeTab}`}
                id={PANEL_TABS.find((t) => t.id === activeTab)?.panelId}
                role="tabpanel"
                aria-labelledby={
                  PANEL_TABS.find((t) => t.id === activeTab)?.tabId
                }
                className="wtr-dest-panel__tabpanel wtr-dest-panel__tabpanel--enter"
              >
                {activeTab === "col" ? (
                  <>
                    <div className="wtr-dest-panel__col-stack">
                      <div className="wtr-dest-panel__cards wtr-dest-panel__cards--budget">
                        {colBudgetCards.map((card, index) => (
                          <ColPanelCardSection
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
                          Not included in budget estimate
                        </p>
                        <div className="wtr-dest-panel__cards wtr-dest-panel__cards--extras">
                          {colSupplementalCards.map((card, index) => (
                            <ColPanelCardSection
                              key={card.id}
                              card={card}
                              staggerIndex={colBudgetCards.length + 1 + index}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {showTravelAdvisory ? (
                      <div
                        className="wtr-dest-panel__stagger-item"
                        style={panelStaggerStyle(
                          colBudgetCards.length +
                            1 +
                            colSupplementalCards.length,
                        )}
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
                ) : (
                  <DestinationPeopleCultureTab
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
    </>
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
  listPageNav,
}: Props) {
  const [slideOpen, setSlideOpen] = useState(false);
  useWtrPageScrollLock(open);

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

  const budgetBreakdown = useMemo(
    () => (scored ? buildBudgetBreakdownDisplay(scored.city) : null),
    [scored],
  );

  if (!scored || !budgetBreakdown) return null;

  return (
    <>
      <button
        type="button"
        className={`wtr-dest-panel__backdrop${slideOpen ? " wtr-dest-panel__backdrop--open" : ""}`}
        aria-label="Close destination details"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className={`wtr-dest-panel${slideOpen ? " wtr-dest-panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby="wtr-dest-panel-title"
      >
        <DestinationPanelCityView
          key={scored.city.id}
          scored={scored}
          monthlyIncome={monthlyIncome}
          budgetBreakdown={budgetBreakdown}
          compareSelected={compareSelected}
          compareAtMax={compareAtMax}
          onToggleCompare={onToggleCompare}
          listPageNav={listPageNav}
        />
      </aside>
    </>
  );
}
