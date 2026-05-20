import { useState, type ReactNode } from 'react'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import {
  IconBarbell,
  IconBolt,
  IconBriefcase,
  IconBus,
  IconGlassFull,
  IconHome,
  IconToolsKitchen2,
  IconWifi,
  IconX,
} from '@tabler/icons-react'
import { WtrCompareToggleButton } from './WtrCompareToggleButton'
import { useCityClimate } from '../../hooks/useCityClimate'
import { useDestinationLiveData } from '../../hooks/useDestinationLiveData'
import type { LocalCurrencyInfo } from '../../lib/api/exchangeRates'
import { formatUsdToLocalRate } from '../../lib/api/exchangeRates'
import type { ScoredMapCity } from '../../lib/whereToRetire/cityMapScoring'
import { matchTier } from '../../lib/whereToRetire/cityMapScoring'
import type { CityData, MapCity } from '../../utils/costOfLiving'
import {
  countryToFlagEmoji,
  formatUsd,
  formatUsdOrDash,
  hasTravelAdvisory,
} from '../../utils/costOfLiving'
import { TravelAdvisoryNotice } from './TravelAdvisoryNotice'
import {
  foodCardSubtitle,
  formatGasolineDualPrice,
  utilitiesCardSubtitle,
} from '../../utils/units'
import { ClimateCard } from './ClimateCard'
import { DestinationTaxVisaTab } from './DestinationTaxVisaTab'
import { FitGauge } from './FitGauge'
import './ClimateCard.scss'
import './RetirementDestinationPanel.scss'

type Props = {
  scored: ScoredMapCity | null
  monthlyIncome: number
  open: boolean
  onClose: () => void
  compareSelected: boolean
  compareAtMax: boolean
  onToggleCompare: () => void
}

type PanelTab = 'col' | 'taxVisa' | 'qol'

type DataRow = {
  label: string
  value: string
}

type DetailCard = {
  kind: 'detail'
  id: string
  title: string
  subtitle?: string
  icon: ReactNode
  rows: DataRow[]
}

type StatCard = {
  kind: 'stat'
  id: string
  label: string
  value: string
  subtitle?: string
  icon: ReactNode
}

type PanelCard = DetailCard | StatCard

const CARD_ICON_SIZE = 24

function monthlyFoodEstimate(city: CityData): number {
  return Math.round(city.meal_inexpensive_restaurant * 45)
}

function buildColCards(city: CityData): PanelCard[] {
  return [
    {
      kind: 'detail',
      id: 'rent',
      title: 'Rent',
      icon: <IconHome size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />,
      rows: [
        { label: '1BR rent, outside center', value: formatUsdOrDash(city.rent_1br_outside_centre) },
        { label: '1BR rent, city center', value: formatUsdOrDash(city.rent_1br_city_centre) },
        { label: '3BR rent, outside center', value: formatUsdOrDash(city.rent_3br_outside_centre) },
      ],
    },
    {
      kind: 'detail',
      id: 'food',
      title: 'Food',
      subtitle: foodCardSubtitle(),
      icon: <IconToolsKitchen2 size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />,
      rows: [
        { label: 'Monthly estimate', value: formatUsdOrDash(monthlyFoodEstimate(city)) },
        { label: 'Inexpensive restaurant meal', value: formatUsdOrDash(city.meal_inexpensive_restaurant) },
        { label: 'McMeal at McDonald\'s', value: formatUsdOrDash(city.mcmeal) },
        { label: 'Cappuccino', value: formatUsdOrDash(city.cappuccino) },
        { label: 'Domestic beer (draft)', value: formatUsdOrDash(city.domestic_beer_draught) },
        { label: 'Imported beer (bottle)', value: formatUsdOrDash(city.imported_beer_bottle) },
        { label: 'Wine (mid-range bottle)', value: formatUsdOrDash(city.wine_bottle_midrange) },
      ],
    },
    {
      kind: 'detail',
      id: 'transport',
      title: 'Transport',
      icon: <IconBus size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />,
      rows: [
        { label: 'Monthly transit pass', value: formatUsdOrDash(city.transport_monthly_pass) },
        { label: 'Gasoline', value: formatGasolineDualPrice(city.gasoline_1L) },
      ],
    },
    {
      kind: 'detail',
      id: 'utilities',
      title: 'Utilities',
      subtitle: utilitiesCardSubtitle(),
      icon: <IconBolt size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />,
      rows: [
        { label: 'Utilities (monthly)', value: formatUsdOrDash(city.utilities_monthly_85m2) },
      ],
    },
    {
      kind: 'stat',
      id: 'internet',
      label: 'Internet (60 Mbps)',
      value: formatUsdOrDash(city.internet_60mbps_monthly),
      subtitle: 'Monthly broadband',
      icon: <IconWifi size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />,
    },
    {
      kind: 'stat',
      id: 'gym',
      label: 'Gym membership',
      value: formatUsdOrDash(city.gym_monthly),
      subtitle: 'Monthly, one adult',
      icon: <IconBarbell size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />,
    },
    {
      kind: 'stat',
      id: 'dining',
      label: 'Mid-range dinner for 2',
      value: formatUsdOrDash(city.meal_midrange_restaurant_for2),
      subtitle: 'Three courses, no drinks',
      icon: <IconGlassFull size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />,
    },
  ]
}

function buildQolCards(city: MapCity, monthlyIncome: number, currency: LocalCurrencyInfo | null): DetailCard[] {
  const salaryRatio =
    city.avg_monthly_net_salary > 0
      ? `${Math.round((monthlyIncome / city.avg_monthly_net_salary) * 100)}% of local avg.`
      : '—'

  const economyRows: DataRow[] = [
    { label: 'Avg. monthly net salary', value: formatUsdOrDash(city.avg_monthly_net_salary) },
    { label: 'Your income vs. locals', value: salaryRatio },
  ]

  if (currency) {
    economyRows.push(
      { label: 'Local currency', value: `${currency.currencyName} (${currency.currencyCode})` },
      {
        label: 'Exchange rate',
        value: `1 USD ≈ ${formatUsdToLocalRate(currency.rate, currency.currencyCode)} ${currency.currencyCode}`,
      },
    )
  }

  return [
    {
      kind: 'detail',
      id: 'lifestyle',
      title: 'Leisure',
      icon: <IconBarbell size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />,
      rows: [{ label: 'Cinema ticket', value: formatUsdOrDash(city.cinema_ticket) }],
    },
    {
      kind: 'detail',
      id: 'economy',
      title: 'Local economy',
      icon: <IconBriefcase size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />,
      rows: economyRows,
    },
  ]
}

function DetailCardSection({ card }: { card: DetailCard }) {
  return (
    <article className="wtr-dest-panel__card">
      <span className="wtr-dest-panel__card-icon-top">{card.icon}</span>
      <h4 className="wtr-dest-panel__card-title wtr-dest-panel__card-title--centered">{card.title}</h4>
      {card.subtitle ? <p className="wtr-dest-panel__card-subtitle wtr-dest-panel__card-subtitle--centered">{card.subtitle}</p> : null}
      <dl className="wtr-dest-panel__card-rows">
        {card.rows.map((row) => (
          <div key={row.label} className="wtr-dest-panel__card-row">
            <dt className="wtr-dest-panel__card-row-label">{row.label}</dt>
            <dd className="wtr-dest-panel__card-row-value">{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

function StatCardSection({ card }: { card: StatCard }) {
  return (
    <article className="wtr-dest-panel__card wtr-dest-panel__card--stat">
      <span className="wtr-dest-panel__card-icon-top">{card.icon}</span>
      <p className="wtr-dest-panel__stat-label">{card.label}</p>
      <p className="wtr-dest-panel__stat-value">{card.value}</p>
      {card.subtitle ? <p className="wtr-dest-panel__card-subtitle wtr-dest-panel__card-subtitle--centered">{card.subtitle}</p> : null}
    </article>
  )
}

function PanelCardSection({ card }: { card: PanelCard }) {
  if (card.kind === 'stat') return <StatCardSection card={card} />
  return <DetailCardSection card={card} />
}

export function RetirementDestinationPanel({
  scored,
  monthlyIncome,
  open,
  onClose,
  compareSelected,
  compareAtMax,
  onToggleCompare,
}: Props) {
  const [activeTab, setActiveTab] = useState<PanelTab>('col')
  const { currency } = useDestinationLiveData(scored?.city ?? null)
  const { climate, loading: climateLoading, failed: climateFailed } = useCityClimate(scored?.city ?? null)

  if (!scored) return null

  const { city, monthlyBudget, affordabilityScore, colExplanation } = scored
  const tier = matchTier(affordabilityScore)
  const flagEmoji = countryToFlagEmoji(city.country)
  const colCards = buildColCards(city)
  const qolCards = buildQolCards(city, monthlyIncome, currency)
  const showTravelAdvisory = hasTravelAdvisory(city.country)

  return (
    <>
      <button
        type="button"
        className={`wtr-dest-panel__backdrop${open ? ' wtr-dest-panel__backdrop--open' : ''}`}
        aria-label="Close destination details"
        onClick={onClose}
      />
      <aside
        className={`wtr-dest-panel${open ? ' wtr-dest-panel--open' : ''}`}
        aria-hidden={!open}
        aria-labelledby="wtr-dest-panel-title"
      >
        <WtrCompareToggleButton
          className="wtr-compare-corner--panel"
          selected={compareSelected}
          atMax={compareAtMax}
          cityName={city.city}
          onToggle={onToggleCompare}
        />
        <header className="wtr-dest-panel__sticky-head">
          <div className="wtr-dest-panel__header">
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
            <div className="wtr-dest-panel__header-actions">
              <button type="button" className="wtr-dest-panel__close" onClick={onClose} aria-label="Close">
                <IconX size={20} stroke={1.5} />
              </button>
            </div>
          </div>

          <section className="wtr-dest-panel__summary" aria-label="Monthly budget estimate">
            <p className={`wtr-dest-panel__summary-total wtr-dest-panel__summary-total--${tier}`}>
              {formatUsd(monthlyBudget)}
            </p>
            <div className="wtr-dest-panel__summary-copy">
              <h3 className="wtr-dest-panel__section-title">Estimated monthly budget</h3>
              <p className="wtr-dest-panel__summary-note">
                Single-person estimate based on rent outside city center, food, transport, utilities, and internet.
              </p>
            </div>
          </section>
        </header>

        <SimpleBar key={city.id} className="wtr-dest-panel__scroll" autoHide={false}>
          <div className="wtr-dest-panel__body">
            <div className="wtr-dest-panel__tabs" role="tablist" aria-label="Destination details">
              <button
                type="button"
                role="tab"
                id="wtr-dest-tab-col"
                aria-selected={activeTab === 'col'}
                aria-controls="wtr-dest-tabpanel-col"
                className={`wtr-dest-panel__tab${activeTab === 'col' ? ' wtr-dest-panel__tab--active' : ''}`}
                onClick={() => setActiveTab('col')}
              >
                Cost of Living
              </button>
              <button
                type="button"
                role="tab"
                id="wtr-dest-tab-tax-visa"
                aria-selected={activeTab === 'taxVisa'}
                aria-controls="wtr-dest-tabpanel-tax-visa"
                className={`wtr-dest-panel__tab${activeTab === 'taxVisa' ? ' wtr-dest-panel__tab--active' : ''}`}
                onClick={() => setActiveTab('taxVisa')}
              >
                Tax & Visa
              </button>
              <button
                type="button"
                role="tab"
                id="wtr-dest-tab-qol"
                aria-selected={activeTab === 'qol'}
                aria-controls="wtr-dest-tabpanel-qol"
                className={`wtr-dest-panel__tab${activeTab === 'qol' ? ' wtr-dest-panel__tab--active' : ''}`}
                onClick={() => setActiveTab('qol')}
              >
                Quality of Life
              </button>
            </div>

            <div
              id={
                activeTab === 'col'
                  ? 'wtr-dest-tabpanel-col'
                  : activeTab === 'taxVisa'
                    ? 'wtr-dest-tabpanel-tax-visa'
                    : 'wtr-dest-tabpanel-qol'
              }
              role="tabpanel"
              aria-labelledby={
                activeTab === 'col'
                  ? 'wtr-dest-tab-col'
                  : activeTab === 'taxVisa'
                    ? 'wtr-dest-tab-tax-visa'
                    : 'wtr-dest-tab-qol'
              }
              className="wtr-dest-panel__tabpanel"
            >
              {activeTab === 'col' ? (
                <>
                  <section className="wtr-dest-panel__gauges" aria-label="Retirement income fit score">
                    <FitGauge
                      label="Retirement income fit score"
                      score={affordabilityScore}
                      explanation={colExplanation}
                      tier={matchTier(affordabilityScore)}
                    />
                  </section>
                  <div className="wtr-dest-panel__cards">
                    {colCards.map((card) => (
                      <PanelCardSection key={card.id} card={card} />
                    ))}
                    <ClimateCard climate={climate} loading={climateLoading} failed={climateFailed} />
                  </div>
                  {showTravelAdvisory ? <TravelAdvisoryNotice /> : null}
                </>
              ) : activeTab === 'taxVisa' ? (
                <DestinationTaxVisaTab country={city.country} />
              ) : (
                <div className="wtr-dest-panel__cards">
                  {qolCards.map((card) => (
                    <DetailCardSection key={card.id} card={card} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </SimpleBar>

        <footer className="wtr-dest-panel__footer">
          <p className="wtr-dest-panel__data-source">
            Estimates based on real prices reported by locals. Updated periodically. All amounts in USD.
          </p>
        </footer>
      </aside>
    </>
  )
}
