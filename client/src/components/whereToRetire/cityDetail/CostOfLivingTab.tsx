import {
  IconBarbell,
  IconBolt,
  IconBus,
  IconDeviceMobile,
  IconGlassFull,
  IconHomeDollar,
  IconMovie,
  IconShoppingCart,
  IconToolsKitchen3,
} from '@tabler/icons-react'
import type { BudgetBreakdownDisplay, MapCity } from '../../../utils/costOfLiving'
import { formatUsd } from '../../../utils/costOfLiving'
import { hasTravelAdvisory } from '../../../utils/costOfLiving'
import { ColBudgetBreakdownBar } from '../ColBudgetBreakdownBar'
import { CityDetailIndexRows } from './CityDetailIndexRows'
import { LITERS_PER_US_GALLON } from '../../../utils/units'
import { rentCardHeaderSubtitle } from '../../../utils/units'
import {
  ColCategoryCard,
  COL_CATEGORY_ICON_SIZE,
  type ColCategoryCardProps,
} from '../ColCategoryCard'
import { ColExtrasList, type ColExtraLineItem } from '../ColExtrasList'
import { DestinationExchangeRate } from '../DestinationExchangeRate'
import { TravelAdvisoryNotice } from '../TravelAdvisoryNotice'
import { formatUsdField } from './cityDetailTabUtils'

type ColCategoryPanelCard = ColCategoryCardProps & { id: string }

const COL_EXTRA_ICON_SIZE = 18

function formatGasPerGallon(pricePerLiter: number): string {
  if (!Number.isFinite(pricePerLiter) || pricePerLiter <= 0) return formatUsdField(null)
  return formatUsd(pricePerLiter * LITERS_PER_US_GALLON)
}

function formatGasPerLiter(pricePerLiter: number): string {
  return formatUsdField(pricePerLiter)
}

function formatColHeaderAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return 'varies'
  return formatUsd(amount)
}

function hasTransitPassData(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0
}

/** Midpoint estimate when 2BR rent is not in source data. */
function estimate2brRent(oneBr: number, threeBr: number): number {
  if (!Number.isFinite(oneBr) || oneBr <= 0) return 0
  if (!Number.isFinite(threeBr) || threeBr <= 0) return Math.round(oneBr * 1.4)
  return Math.round((oneBr + threeBr) / 2)
}

function buildColBudgetCards(
  city: MapCity,
  budgetBreakdown: BudgetBreakdownDisplay,
): ColCategoryPanelCard[] {
  const { breakdown } = budgetBreakdown
  const icon = COL_CATEGORY_ICON_SIZE
  const transitAvailable = hasTransitPassData(city.transport_monthly_pass)
  const foodAndDrinkTotal = breakdown.groceries + breakdown.dining + breakdown.alcohol
  const lifestyleTotal = breakdown.leisure + breakdown.mobile + breakdown.clothing

  return [
    {
      id: 'food-drink',
      variant: 'hero',
      title: 'Food & Drink',
      icon: <IconToolsKitchen3 size={icon} stroke={1.5} aria-hidden />,
      headerAmount: formatColHeaderAmount(foodAndDrinkTotal),
      rows: [
        { label: 'Groceries', value: formatUsd(breakdown.groceries) },
        { label: 'Dining & coffee', value: formatUsd(breakdown.dining) },
        { label: 'Alcohol', value: formatUsd(breakdown.alcohol) },
      ],
      footerPill: 'Based on your lifestyle preset basket and dining habits',
    },
    {
      id: 'rent',
      variant: 'hero',
      title: 'Rent',
      icon: <IconHomeDollar size={icon} stroke={1.5} aria-hidden />,
      headerSubtitle: rentCardHeaderSubtitle(),
      headerAmount: formatColHeaderAmount(breakdown.rent),
      rows: [
        {
          label: '1BR city center',
          value: formatUsdField(city.rent_1br_city_centre),
        },
        {
          label: '1BR outside center',
          value: formatUsdField(city.rent_1br_outside_centre),
        },
        {
          label: '2BR city center',
          value: formatUsdField(
            estimate2brRent(city.rent_1br_city_centre, city.rent_3br_city_centre),
          ),
          note: 'Estimated from 1BR & 3BR',
        },
        {
          label: '2BR outside center',
          value: formatUsdField(
            estimate2brRent(city.rent_1br_outside_centre, city.rent_3br_outside_centre),
          ),
          note: 'Estimated from 1BR & 3BR',
        },
        {
          label: '3BR city center',
          value: formatUsdField(city.rent_3br_city_centre),
        },
        {
          label: '3BR outside center',
          value: formatUsdField(city.rent_3br_outside_centre),
        },
      ],
      footerPill: 'City center is always more expensive',
    },
    {
      id: 'utilities-internet',
      variant: 'hero',
      title: 'Utilities',
      icon: <IconBolt size={icon} stroke={1.5} aria-hidden />,
      headerAmount: formatColHeaderAmount(breakdown.utilities),
      rows: [
        { label: 'Broadband (60 Mbps)', value: 'incl.' },
        { label: 'Electricity', value: 'incl.' },
        { label: 'Water & heating', value: 'incl.' },
      ],
    },
    {
      id: 'transport',
      variant: 'hero',
      title: 'Transportation',
      icon: <IconBus size={icon} stroke={1.5} aria-hidden />,
      headerAmount: formatColHeaderAmount(breakdown.transport),
      rows: [
        {
          label: 'Gas (per gallon)',
          value: formatGasPerGallon(city.gasoline_1L),
        },
        {
          label: 'Gas (per liter)',
          value: formatGasPerLiter(city.gasoline_1L),
        },
        ...(transitAvailable
          ? [
              {
                label: 'Monthly transit pass',
                value: formatUsdField(city.transport_monthly_pass),
              },
            ]
          : []),
      ],
      emptyStateNote: transitAvailable
        ? undefined
        : 'Monthly transit pass data unavailable for this city',
    },
    {
      id: 'lifestyle',
      variant: 'hero',
      title: 'Lifestyle',
      icon: <IconMovie size={icon} stroke={1.5} aria-hidden />,
      headerAmount: formatColHeaderAmount(lifestyleTotal),
      rows: [
        { label: 'Leisure & gym', value: formatUsd(breakdown.leisure) },
        { label: 'Mobile plan', value: formatUsd(breakdown.mobile) },
        { label: 'Clothing & shoes', value: formatUsd(breakdown.clothing) },
      ],
    },
    {
      id: 'health-misc',
      variant: 'hero',
      title: 'Other',
      icon: <IconShoppingCart size={icon} stroke={1.5} aria-hidden />,
      headerAmount: formatColHeaderAmount(
        breakdown.healthInsurance + breakdown.incidentals,
      ),
      rows: [
        { label: 'Health insurance', value: formatUsd(breakdown.healthInsurance) },
        {
          label: 'Incidentals',
          value: formatUsd(breakdown.incidentals),
          note: 'Personal care, household items, gifts',
        },
      ],
    },
  ]
}

function buildColSupplementalItems(city: MapCity): ColExtraLineItem[] {
  const icon = COL_EXTRA_ICON_SIZE
  return [
    {
      id: 'gym',
      label: 'Gym membership',
      value: formatUsdField(city.gym_monthly),
      note: 'Monthly, one adult',
      icon: <IconBarbell size={icon} stroke={1.5} aria-hidden />,
    },
    {
      id: 'leisure',
      label: 'Leisure',
      value: formatUsdField(city.cinema_ticket),
      note: 'Cinema ticket',
      icon: <IconMovie size={icon} stroke={1.5} aria-hidden />,
    },
    {
      id: 'beer',
      label: 'Beer (bottle)',
      value: formatUsdField(city.domestic_beer_bottle),
      note: 'Domestic, supermarket',
      icon: <IconGlassFull size={icon} stroke={1.5} aria-hidden />,
    },
    {
      id: 'mobile',
      label: 'Mobile plan',
      value: formatUsdField(city.mobile_plan_monthly_usd),
      note: 'Prepaid data SIM',
      icon: <IconDeviceMobile size={icon} stroke={1.5} aria-hidden />,
    },
  ]
}

type Props = {
  city: MapCity
  planMonthlyIncome: number
  budgetBreakdown: BudgetBreakdownDisplay
}

export function CostOfLivingTab({
  city,
  planMonthlyIncome,
  budgetBreakdown,
}: Props) {
  const colBudgetCards = buildColBudgetCards(city, budgetBreakdown)
  const colSupplementalItems = buildColSupplementalItems(city)
  const showTravelAdvisory = hasTravelAdvisory(city.country)

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
        <DestinationExchangeRate city={city} planMonthlyIncome={planMonthlyIncome} />
      </div>
      <section
        className="wtr-city-detail__col-budget-group"
        aria-label="Monthly budget breakdown and costs"
      >
        <ColBudgetBreakdownBar
          breakdown={budgetBreakdown}
          className="wtr-city-detail__budget-bar"
          showTitle
        />
        <div className="wtr-city-detail__cards wtr-city-detail__cards--col">
          {colBudgetCards.map((card) => {
            const { id: _id, ...categoryProps } = card
            return (
              <div key={card.id} className="wtr-city-detail__card-cell">
                <ColCategoryCard {...categoryProps} />
              </div>
            )
          })}
        </div>
      </section>
      <div className="wtr-city-detail__col-extras">
        <p className="wtr-city-detail__col-extras-note">
          Local price references
        </p>
        <ColExtrasList items={colSupplementalItems} />
      </div>
    </div>
  )
}
