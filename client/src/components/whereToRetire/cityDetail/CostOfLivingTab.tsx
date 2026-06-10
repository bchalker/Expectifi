import {
  IconBarbell,
  IconBolt,
  IconBus,
  IconHomeDollar,
  IconMovie,
  IconToolsKitchen3,
} from '@tabler/icons-react'
import type { CSSProperties } from 'react'
import type { BudgetBreakdownDisplay, MapCity } from '../../../utils/costOfLiving'
import { formatUsd } from '../../../utils/costOfLiving'
import {
  getMonthlyBudgetComponents,
  hasTravelAdvisory,
} from '../../../utils/costOfLiving'
import { ColBudgetBreakdownBar } from '../ColBudgetBreakdownBar'
import { CityDetailIndexRows } from './CityDetailIndexRows'
import { LITERS_PER_US_GALLON } from '../../../utils/units'
import {
  monthlyFoodEstimate,
  rentCardHeaderSubtitle,
} from '../../../utils/units'
import {
  ColCategoryCard,
  COL_CATEGORY_ICON_SIZE,
  type ColCategoryCardProps,
} from '../ColCategoryCard'
import { ColExtrasList, type ColExtraLineItem } from '../ColExtrasList'
import { DestinationExchangeRate } from '../DestinationExchangeRate'
import { TravelAdvisoryNotice } from '../TravelAdvisoryNotice'
import { formatUsdField, type CityDetailTabStaggerProps, staggerSectionProps } from './cityDetailTabUtils'

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

function buildColBudgetCards(city: MapCity): ColCategoryPanelCard[] {
  const components = getMonthlyBudgetComponents(city)
  const icon = COL_CATEGORY_ICON_SIZE
  const transitAvailable = hasTransitPassData(city.transport_monthly_pass)

  return [
    {
      id: 'food',
      variant: 'hero',
      title: 'Food',
      icon: <IconToolsKitchen3 size={icon} stroke={1.5} aria-hidden />,
      headerAmount: formatColHeaderAmount(monthlyFoodEstimate(city.meal_inexpensive_restaurant)),
      rows: [
        {
          label: 'Inexpensive meal',
          value: formatUsdField(city.meal_inexpensive_restaurant),
        },
        { label: 'McMeal', value: formatUsdField(city.mcmeal) },
        { label: 'Cappuccino', value: formatUsdField(city.cappuccino) },
        {
          label: 'Beer (draft)',
          value: formatUsdField(city.domestic_beer_draught),
        },
        {
          label: 'Beer (bottle)',
          value: formatUsdField(city.imported_beer_bottle),
        },
        {
          label: 'Wine (mid-range)',
          value: formatUsdField(city.wine_bottle_midrange),
        },
        {
          label: 'Dinner for 2',
          value: formatUsdField(city.meal_midrange_restaurant_for2),
          note: 'Three courses, no drinks',
        },
      ],
      footerPill: (
        <>
          Based on 45 <strong>inexpensive</strong> meals/mo
        </>
      ),
    },
    {
      id: 'rent',
      variant: 'hero',
      title: 'Rent',
      icon: <IconHomeDollar size={icon} stroke={1.5} aria-hidden />,
      headerSubtitle: rentCardHeaderSubtitle(),
      headerAmount: formatColHeaderAmount(city.rent_1br_outside_centre),
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
      headerAmount: formatColHeaderAmount(components.utilitiesInternet),
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
      headerAmount: 'varies',
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
  ]
}

type Props = CityDetailTabStaggerProps & {
  city: MapCity
  budgetBreakdown: BudgetBreakdownDisplay
}

function panelStaggerStyle(index: number): CSSProperties {
  return { '--wtr-panel-i': index } as CSSProperties
}

export function CostOfLivingTab({
  city,
  budgetBreakdown,
  staggerClassName,
  staggerStyle,
}: Props) {
  const colBudgetCards = buildColBudgetCards(city)
  const colSupplementalItems = buildColSupplementalItems(city)
  const showTravelAdvisory = hasTravelAdvisory(city.country)
  const stagger = staggerStyle ?? panelStaggerStyle

  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--col">
      <section
        className="wtr-city-detail__col-summary"
        aria-label="Budget breakdown and cost indices"
        {...staggerSectionProps(0, 'wtr-city-detail__col-summary', staggerClassName, stagger)}
      >
        <ColBudgetBreakdownBar
          breakdown={budgetBreakdown}
          className="wtr-city-detail__budget-bar"
          showTitle
          utilitiesLegendLabel="Utilities"
        />
        <CityDetailIndexRows country={city.country} />
      </section>
      {showTravelAdvisory ? (
        <div {...staggerSectionProps(1, undefined, staggerClassName, stagger)}>
          <TravelAdvisoryNotice />
        </div>
      ) : null}
      <DestinationExchangeRate
        city={city}
        staggerClassName={staggerClassName}
        staggerStyle={stagger}
      />
      <div className="wtr-city-detail__cards wtr-city-detail__cards--col">
        {colBudgetCards.map((card, index) => {
          const { id: _id, ...categoryProps } = card
          const staggerOffset = 1 + (showTravelAdvisory ? 1 : 0)
          return (
            <div
              key={card.id}
              className={['wtr-city-detail__card-cell', staggerClassName]
                .filter(Boolean)
                .join(' ')}
              style={stagger(index + staggerOffset)}
            >
              <ColCategoryCard {...categoryProps} />
            </div>
          )
        })}
      </div>
      <div className="wtr-city-detail__col-extras">
        <p
          className="wtr-city-detail__col-extras-note"
          {...staggerSectionProps(
            colBudgetCards.length + 1 + (showTravelAdvisory ? 1 : 0),
            'wtr-city-detail__col-extras-note',
            staggerClassName,
            stagger,
          )}
        >
          Optional lifestyle costs
        </p>
        <ColExtrasList
          items={colSupplementalItems}
          className={staggerClassName}
          style={stagger(colBudgetCards.length + 2 + (showTravelAdvisory ? 1 : 0))}
        />
      </div>
    </div>
  )
}
