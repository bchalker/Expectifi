import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { OverlayScrollbars } from "overlayscrollbars";
import { CloseButton } from "@heroui/react";
import { AppOverlayScrollbars } from "../ui/AppOverlayScrollbars";
import { AppSelect } from "../ui/AppSelect";
import { BottomSheetHandle } from "../ui/BottomSheetHandle";
import { BottomSheetPortal } from "../ui/BottomSheetPortal";
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
} from "@tabler/icons-react";
import { useCityClimate } from "../../hooks/useCityClimate";
import { useBottomSheetDrag } from "../../hooks/useBottomSheetDrag";
import { useWtrDestPanelMobileSheet } from "../../hooks/useWtrDestPanelMobileSheet";
import type {
  ScoredMapCity,
  MapFilters,
} from "../../lib/whereToRetire/cityMapScoring";
import { monthlyOutflowForMapCity } from "../../lib/whereToRetire/mapIncomeFit";
import { calculateRetirementScore } from "../../utils/retirementScore";
import type { CityData } from "../../utils/costOfLiving";
import {
  buildBudgetBreakdownDisplay,
  countryToFlagEmoji,
  formatUsd,
  formatUsdOrDash,
  getMonthlyBudgetComponents,
  hasTravelAdvisory,
} from "../../utils/costOfLiving";
import { DEMOGRAPHICS_TAB_SOURCE_FOOTER } from "../../utils/demographics";
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

export type DestinationListNav = {
  index: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
};

type Props = {
  scored: ScoredMapCity | null;
  monthlyIncome: number;
  mapFilters: Pick<MapFilters, "includeHealthIns" | "healthInsMonthlyUsd">;
  open: boolean;
  onClose: () => void;
  listNav: DestinationListNav | null;
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

const PANEL_ESTIMATES_NOTE =
  "Estimates based on real prices reported by locals. Updated periodically. All amounts in USD.";

function DestinationPanelTabSelect({
  activeTab,
  onChange,
  variant = "default",
}: {
  activeTab: PanelTab;
  onChange: (tab: PanelTab) => void;
  /** Sheet header: native picker styled as underlined section label. */
  variant?: "default" | "sheet";
}) {
  const activeLabel =
    PANEL_TABS.find((tab) => tab.id === activeTab)?.label ?? "Section";

  if (variant === "sheet") {
    return (
      <div className="wtr-dest-panel__tab-select wtr-dest-panel__tab-select--sheet">
        <div className="wtr-dest-panel__tab-select-sheet-inner">
          <span className="wtr-dest-panel__tab-select-display" aria-hidden>
            {activeLabel}
          </span>
          <div className="wtr-dest-panel__tab-select-hit">
            <AppSelect
              className="wtr-dest-panel__tab-select-native"
              ariaLabel="Destination section"
              value={activeTab}
              options={PANEL_TABS.map((tab) => ({
                id: tab.id,
                label: tab.label,
              }))}
              onChange={(id) => onChange(id as PanelTab)}
              layout="native"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppSelect
      className="wtr-dest-panel__tab-select"
      ariaLabel="Destination section"
      label="Section"
      labelClassName="wtr-dest-panel__tab-select-label"
      value={activeTab}
      options={PANEL_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
      onChange={(id) => onChange(id as PanelTab)}
      popoverClassName="wtr-dest-panel__tab-select-popover"
      layout="auto"
    />
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

type ColSectionHeroProps = {
  panelMonthlyBudget: number;
  monthlySurplus: number;
  headerScore: ReturnType<typeof calculateRetirementScore>;
};

function ColSectionHero({
  panelMonthlyBudget,
  monthlySurplus,
  headerScore,
}: ColSectionHeroProps) {
  return (
    <section
      className="wtr-dest-panel__col-hero wtr-dest-panel__stagger-item"
      style={panelStaggerStyle(0)}
      aria-label="Monthly budget and retirement score"
    >
      <div className="wtr-dest-panel__col-hero-budget">
        <p className="wtr-dest-panel__col-hero-total tabular-nums">
          {formatUsd(panelMonthlyBudget)}
          <span className="wtr-dest-panel__summary-period">/mo</span>
        </p>
        {monthlySurplus > 0 ? (
          <p className="wtr-dest-panel__col-hero-surplus tabular-nums">
            + {formatUsd(monthlySurplus)}
            <span className="wtr-dest-panel__summary-period">/mo</span>
          </p>
        ) : null}
      </div>
      <RetirementScoreHeader
        className="wtr-dest-panel__col-hero-score"
        displayScore={headerScore.displayScore}
        incomeFitScore={headerScore.incomeFitScore}
        qolNormalized={headerScore.qolNormalized}
        warnings={headerScore.warnings}
        band={headerScore.band}
        bandColor={headerScore.bandColor}
        bandLabel={headerScore.bandLabel}
      />
    </section>
  );
}

type CityViewProps = {
  scored: ScoredMapCity;
  monthlyIncome: number;
  mapFilters: Pick<MapFilters, "includeHealthIns" | "healthInsMonthlyUsd">;
  budgetBreakdown: NonNullable<ReturnType<typeof buildBudgetBreakdownDisplay>>;
  listNav: DestinationListNav | null;
  mobileSheet: boolean;
  onClose: () => void;
};

/** Remounts when city.id changes so scroll content never stacks on prev/next navigation. */
function DestinationPanelCityView({
  scored,
  monthlyIncome,
  mapFilters,
  budgetBreakdown,
  listNav,
  mobileSheet,
  onClose,
}: CityViewProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("col");
  const [stickyHeadStuck, setStickyHeadStuck] = useState(false);
  const activeTabMeta = PANEL_TABS.find((t) => t.id === activeTab);
  const {
    climate,
    loading: climateLoading,
    failed: climateFailed,
  } = useCityClimate(scored.city);

  const { city } = scored;

  const panelMonthlyBudget = useMemo(
    () => monthlyOutflowForMapCity(scored, monthlyIncome, mapFilters),
    [scored, monthlyIncome, mapFilters],
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

  const monthlySurplus = Math.max(0, monthlyIncome - panelMonthlyBudget);
  const flagEmoji = countryToFlagEmoji(city.country);
  const colBudgetCards = buildColBudgetCards(city);
  const colSupplementalItems = buildColSupplementalItems(city);
  const showTravelAdvisory = hasTravelAdvisory(city.country);

  const syncStickyHeadStuck = useCallback((instance: OverlayScrollbars) => {
    const { scrollOffsetElement } = instance.elements();
    setStickyHeadStuck(scrollOffsetElement.scrollTop > 0);
  }, []);

  useEffect(() => {
    setStickyHeadStuck(false);
  }, [activeTab, city.id]);

  return (
    <div className="wtr-dest-panel__layout">
      <header
        className={[
          "wtr-dest-panel__sticky-head",
          stickyHeadStuck && "wtr-dest-panel__sticky-head--stuck",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className="wtr-dest-panel__header wtr-dest-panel__stagger-item"
          style={panelStaggerStyle(0)}
        >
          <div className="wtr-dest-panel__title-row">
            <div className="wtr-dest-panel__titles">
              <div className="wtr-dest-panel__country-line">
                <span className="wtr-dest-panel__flag" aria-hidden>
                  {flagEmoji}
                </span>
                <p className="wtr-dest-panel__country">{city.country}</p>
              </div>
              <h2 id="wtr-dest-panel-title" className="wtr-dest-panel__name">
                {city.city}
              </h2>
              {mobileSheet ? (
                <DestinationPanelTabSelect
                  variant="sheet"
                  activeTab={activeTab}
                  onChange={setActiveTab}
                />
              ) : null}
            </div>
            {!mobileSheet ? (
              <CloseButton
                className="panel-close-btn wtr-dest-panel__close"
                aria-label="Close destination details"
                onPress={onClose}
              />
            ) : null}
          </div>
        </div>

        {mobileSheet ? (
          <div
            className="wtr-dest-panel__head-divider wtr-dest-panel__stagger-item"
            style={panelStaggerStyle(1)}
            aria-hidden
          />
        ) : (
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
                    + {formatUsd(monthlySurplus)}
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
        )}
      </header>

      <div className="wtr-dest-panel__scroll">
        {!mobileSheet ? (
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
        ) : null}

        <AppOverlayScrollbars
          className="wtr-dest-panel__tab-content"
          defer={false}
          events={{
            initialized: syncStickyHeadStuck,
            scroll: syncStickyHeadStuck,
          }}
        >
          <div className="wtr-dest-panel__body">
            <div
              key={`${city.id}-${activeTab}`}
              id={activeTabMeta?.panelId}
              role={mobileSheet ? "region" : "tabpanel"}
              aria-label={
                mobileSheet
                  ? `${activeTabMeta?.label ?? "Section"} details`
                  : undefined
              }
              aria-labelledby={mobileSheet ? undefined : activeTabMeta?.tabId}
              className="wtr-dest-panel__tabpanel wtr-dest-panel__tabpanel--enter"
            >
              {activeTab === "col" ? (
                <>
                  {mobileSheet ? (
                    <>
                      <ColSectionHero
                        panelMonthlyBudget={panelMonthlyBudget}
                        monthlySurplus={monthlySurplus}
                        headerScore={headerScore}
                      />
                      {showTravelAdvisory ? (
                        <div
                          className="wtr-dest-panel__stagger-item"
                          style={panelStaggerStyle(1)}
                        >
                          <TravelAdvisoryNotice />
                        </div>
                      ) : null}
                      <div
                        className="wtr-dest-panel__col-hero-divider wtr-dest-panel__stagger-item"
                        style={panelStaggerStyle(showTravelAdvisory ? 2 : 1)}
                        aria-hidden
                      />
                    </>
                  ) : null}
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
                          staggerIndex={
                            index +
                            (mobileSheet ? (showTravelAdvisory ? 4 : 3) : 0)
                          }
                        />
                      ))}
                    </div>
                    <div className="wtr-dest-panel__col-extras">
                      <p
                        className="wtr-dest-panel__col-extras-note wtr-dest-panel__stagger-item"
                        style={panelStaggerStyle(
                          colBudgetCards.length +
                            (mobileSheet ? (showTravelAdvisory ? 4 : 3) : 0),
                        )}
                      >
                        Optional lifestyle costs
                      </p>
                      <ColExtrasList
                        items={colSupplementalItems}
                        className="wtr-dest-panel__stagger-item"
                        style={panelStaggerStyle(
                          colBudgetCards.length +
                            1 +
                            (mobileSheet ? (showTravelAdvisory ? 4 : 3) : 0),
                        )}
                      />
                    </div>
                  </div>
                  {!mobileSheet && showTravelAdvisory ? (
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

            {mobileSheet ? (
              <div className="wtr-dest-panel__scroll-end">
                {activeTab === "col" ? (
                  <ColBudgetBreakdownBar breakdown={budgetBreakdown} />
                ) : null}
                {activeTab === "peopleCulture" ? (
                  <p className="wtr-dest-panel__scroll-end-source">
                    {DEMOGRAPHICS_TAB_SOURCE_FOOTER}
                  </p>
                ) : null}
                {listNav ? (
                  <p className="wtr-dest-panel__scroll-end-source">
                    {PANEL_ESTIMATES_NOTE}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </AppOverlayScrollbars>
      </div>

      <footer className="wtr-dest-panel__footer">
        {activeTab === "col" && !mobileSheet ? (
          <ColBudgetBreakdownBar breakdown={budgetBreakdown} />
        ) : null}
        {activeTab === "peopleCulture" && !mobileSheet ? (
          <p className="wtr-dest-panel__footer-source">
            {DEMOGRAPHICS_TAB_SOURCE_FOOTER}
          </p>
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
    </div>
  );
}

export function RetirementDestinationPanel({
  scored,
  monthlyIncome,
  mapFilters,
  open,
  onClose,
  listNav,
}: Props) {
  const mobileSheet = useWtrDestPanelMobileSheet();
  const [slideOpen, setSlideOpen] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);

  const {
    isDragging,
    panelStyle: dragPanelStyle,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useBottomSheetDrag({
    enabled: mobileSheet,
    open: open && slideOpen,
    panelRef: sheetRef,
    onDismiss: onClose,
  });

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

  const sheetStyle: CSSProperties | undefined = mobileSheet
    ? dragPanelStyle
    : undefined;

  return (
    <BottomSheetPortal enabled={mobileSheet}>
      {mobileSheet ? (
        <div
          className={[
            "mobile-bottom-sheet-backdrop",
            slideOpen && "mobile-bottom-sheet-backdrop--open",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        ref={sheetRef}
        className={[
          "wtr-dest-panel",
          slideOpen && "wtr-dest-panel--open",
          mobileSheet && "wtr-dest-panel--sheet",
          isDragging && "mobile-bottom-sheet-panel--dragging",
        ]
          .filter(Boolean)
          .join(" ")}
        style={sheetStyle}
        role="dialog"
        aria-modal={mobileSheet}
        aria-hidden={!open}
        aria-labelledby="wtr-dest-panel-title"
      >
        {mobileSheet ? (
          <BottomSheetHandle
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        ) : null}
        <DestinationPanelCityView
          key={scored.city.id}
          scored={scored}
          monthlyIncome={monthlyIncome}
          mapFilters={mapFilters}
          budgetBreakdown={budgetBreakdown}
          listNav={listNav}
          mobileSheet={mobileSheet}
          onClose={onClose}
        />
      </aside>
    </BottomSheetPortal>
  );
}
