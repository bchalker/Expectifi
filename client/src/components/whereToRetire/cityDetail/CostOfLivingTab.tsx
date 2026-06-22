import {
  IconBolt,
  IconBus,
  IconHomeDollar,
  IconMovie,
  IconShoppingCart,
  IconToolsKitchen3,
} from "@tabler/icons-react";
import type {
  BudgetBreakdownDisplay,
  LifestyleInputs,
  MapCity,
} from "../../../utils/costOfLiving";
import {
  buildAlcoholBudgetLineItems,
  buildDiningBudgetLineItems,
  formatUsd,
  hasTravelAdvisory,
} from "../../../utils/costOfLiving";
import {
  ColBudgetBreakdownBar,
  COL_BUDGET_CARD_CATEGORY_DOT,
} from "../ColBudgetBreakdownBar";
import { ColGroceriesBudgetCard } from "../ColGroceriesBudgetCard";
import { CityDetailIndexRows } from "./CityDetailIndexRows";
import { LITERS_PER_US_GALLON } from "../../../utils/units";
import { rentCardHeaderSubtitle } from "../../../utils/units";
import {
  ColCategoryCard,
  COL_CATEGORY_ICON_SIZE,
  type ColCategoryCardProps,
} from "../ColCategoryCard";
import { DestinationExchangeRate } from "../DestinationExchangeRate";
import { TravelAdvisoryNotice } from "../TravelAdvisoryNotice";
import { formatUsdField } from "./cityDetailTabUtils";

type ColCategoryPanelCard = ColCategoryCardProps & { id: string };

function formatGasPerGallon(pricePerLiter: number): string {
  if (!Number.isFinite(pricePerLiter) || pricePerLiter <= 0)
    return formatUsdField(null);
  return formatUsd(pricePerLiter * LITERS_PER_US_GALLON);
}

function formatGasPerLiter(pricePerLiter: number): string {
  return formatUsdField(pricePerLiter);
}

function formatColHeaderAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "varies";
  return formatUsd(amount);
}

function hasTransitPassData(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}

function buildColBudgetCards(
  city: MapCity,
  budgetBreakdown: BudgetBreakdownDisplay,
  lifestyle: LifestyleInputs,
): ColCategoryPanelCard[] {
  const { breakdown } = budgetBreakdown;
  const icon = COL_CATEGORY_ICON_SIZE;
  const transitAvailable = hasTransitPassData(city.transport_monthly_pass);
  const lifestyleTotal =
    breakdown.leisure + breakdown.mobile + breakdown.clothing;
  const diningLineItems = buildDiningBudgetLineItems(city, lifestyle);
  const alcoholLineItems = buildAlcoholBudgetLineItems(city, lifestyle);
  const diningDrinksGroups = [
    ...(diningLineItems.length > 0
      ? [
          {
            title: "Dining",
            rows: diningLineItems.map((item) => ({
              label: item.label,
              value: formatUsd(item.amount),
            })),
          },
        ]
      : []),
    ...(alcoholLineItems.length > 0
      ? [
          {
            title: "Alcohol",
            rows: alcoholLineItems.map((item) => ({
              label: item.label,
              value: formatUsd(item.amount),
            })),
          },
        ]
      : []),
  ];

  return [
    {
      id: "rent",
      variant: "hero",
      title: "Rent",
      icon: <IconHomeDollar size={icon} stroke={1.5} aria-hidden />,
      headerSubtitle: rentCardHeaderSubtitle(),
      headerAmount: formatColHeaderAmount(breakdown.rent),
      rows: [
        {
          label: "1BR city center",
          value: formatUsdField(city.rent_1br_city_centre),
        },
        {
          label: "1BR outside center",
          value: formatUsdField(city.rent_1br_outside_centre),
        },
        {
          label: "3BR city center",
          value: formatUsdField(city.rent_3br_city_centre),
        },
        {
          label: "3BR outside center",
          value: formatUsdField(city.rent_3br_outside_centre),
        },
      ],
      footerPill: "City center is always more expensive",
    },
    {
      id: "dining-drinks",
      variant: "hero",
      title: "Dining & drinks",
      icon: <IconToolsKitchen3 size={icon} stroke={1.5} aria-hidden />,
      headerAmount: formatColHeaderAmount(breakdown.dining + breakdown.alcohol),
      rowGroups: diningDrinksGroups,
    },
    {
      id: "utilities-internet",
      variant: "hero",
      title: "Utilities",
      icon: <IconBolt size={icon} stroke={1.5} aria-hidden />,
      headerAmount: formatColHeaderAmount(breakdown.utilities),
      rows: [
        { label: "Internet", value: "incl." },
        { label: "Electricity", value: "incl." },
        { label: "Water & heating", value: "incl." },
      ],
    },
    {
      id: "transport",
      variant: "hero",
      title: "Transportation",
      icon: <IconBus size={icon} stroke={1.5} aria-hidden />,
      headerAmount: formatColHeaderAmount(breakdown.transport),
      rows: [
        {
          label: "Gas (per gallon)",
          value: formatGasPerGallon(city.gasoline_1L),
        },
        {
          label: "Gas (per liter)",
          value: formatGasPerLiter(city.gasoline_1L),
        },
        ...(transitAvailable
          ? [
              {
                label: "Monthly transit pass",
                value: formatUsdField(city.transport_monthly_pass),
              },
            ]
          : []),
      ],
      emptyStateNote: transitAvailable
        ? undefined
        : "Monthly transit pass data unavailable for this city",
    },
    {
      id: "lifestyle",
      variant: "hero",
      title: "Lifestyle",
      icon: <IconMovie size={icon} stroke={1.5} aria-hidden />,
      headerAmount: formatColHeaderAmount(lifestyleTotal),
      rows: [
        { label: "Leisure & gym", value: formatUsd(breakdown.leisure) },
        { label: "Mobile plan", value: formatUsd(breakdown.mobile) },
        { label: "Clothing & shoes", value: formatUsd(breakdown.clothing) },
      ],
    },
    {
      id: "health-misc",
      variant: "hero",
      title: "Other",
      icon: <IconShoppingCart size={icon} stroke={1.5} aria-hidden />,
      headerAmount: formatColHeaderAmount(
        breakdown.healthInsurance + breakdown.incidentals,
      ),
      rows: [
        {
          label: "Health insurance",
          value: formatUsd(breakdown.healthInsurance),
        },
        {
          label: "Incidentals",
          value: formatUsd(breakdown.incidentals),
          note: "Personal care, household items, gifts",
        },
      ],
    },
  ];
}

type Props = {
  city: MapCity;
  planMonthlyIncome: number;
  budgetBreakdown: BudgetBreakdownDisplay;
  lifestyle: LifestyleInputs;
};

export function CostOfLivingTab({
  city,
  planMonthlyIncome,
  budgetBreakdown,
  lifestyle,
}: Props) {
  const colBudgetCards = buildColBudgetCards(city, budgetBreakdown, lifestyle);
  const showTravelAdvisory = hasTravelAdvisory(city.country);

  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--col">
      <section
        className="wtr-city-detail__col-summary"
        aria-label="Cost indices"
      >
        <CityDetailIndexRows country={city.country} />
      </section>
      {showTravelAdvisory ? (
        <div>
          <TravelAdvisoryNotice />
        </div>
      ) : null}
      <div>
        <DestinationExchangeRate
          city={city}
          planMonthlyIncome={planMonthlyIncome}
        />
      </div>
      <section
        className="wtr-city-detail__col-budget-group"
        aria-label="Monthly budget breakdown and costs"
      >
        <div className="detail-panel-card spending_group">
          <ColBudgetBreakdownBar
            breakdown={budgetBreakdown}
            className="wtr-city-detail__budget-bar"
            showTitle
          />
          <ColGroceriesBudgetCard
            amount={budgetBreakdown.breakdown.groceries}
            className="wtr-city-detail__col-groceries"
          />
          <div className="wtr-city-detail__cards wtr-city-detail__cards--col">
            {colBudgetCards.map((card) => {
              const { id: _id, ...categoryProps } = card;
              const categoryDot = COL_BUDGET_CARD_CATEGORY_DOT[card.id];
              return (
                <div key={card.id} className="wtr-city-detail__card-cell">
                  <ColCategoryCard
                    {...categoryProps}
                    categoryDot={categoryDot}
                  />
                </div>
              );
            })}
          </div>
          <p className="wtr-city-detail__col-budget-footnote">
            Based on your lifestyle preset basket and dining habits
          </p>
        </div>
      </section>
    </div>
  );
}
