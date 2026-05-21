import { useMemo, type CSSProperties } from 'react'
import { IconBulb, IconPlane } from '@tabler/icons-react'
import {
  formatAirlinesList,
  formatVisaFreeEntryNote,
  GETTING_THERE_TAB_SOURCE_FOOTER,
  GETTING_THERE_UNAVAILABLE_MESSAGE,
  getGettingThereData,
  googleFlightsSearchUrl,
} from '../../utils/gettingThere'
import './DestinationGettingThereTab.scss'

type Props = {
  country: string
  staggerClassName?: string
  staggerStyle?: (index: number) => CSSProperties
}

function staggerSectionProps(
  index: number,
  baseClass: string | undefined,
  staggerClassName: string | undefined,
  staggerStyle: ((index: number) => CSSProperties) | undefined,
): { className?: string; style?: CSSProperties } {
  if (!staggerClassName || !staggerStyle) {
    return baseClass ? { className: baseClass } : {}
  }
  return {
    className: baseClass ? `${baseClass} ${staggerClassName}` : staggerClassName,
    style: staggerStyle(index),
  }
}

export function DirectFlightsBadge({ direct }: { direct: boolean }) {
  return (
    <span
      className={`wtr-getting-there__status-badge wtr-getting-there__status-badge--${direct ? 'direct' : 'connect'}`}
    >
      {direct ? 'Direct flights available' : 'Connection required'}
    </span>
  )
}

function formatFlightHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1)
}

export function DestinationGettingThereTab({ country, staggerClassName, staggerStyle }: Props) {
  const data = useMemo(() => getGettingThereData(country), [country])

  if (!data) {
    return (
      <p {...staggerSectionProps(0, 'wtr-getting-there__empty', staggerClassName, staggerStyle)}>
        {GETTING_THERE_UNAVAILABLE_MESSAGE}
      </p>
    )
  }

  const flightsUrl = googleFlightsSearchUrl(data)

  return (
    <div className="wtr-getting-there">
      <section
        className="wtr-getting-there__group"
        aria-labelledby="wtr-getting-there-airports-heading"
        {...staggerSectionProps(0, 'wtr-getting-there__group', staggerClassName, staggerStyle)}
      >
        <h3 id="wtr-getting-there-airports-heading" className="wtr-getting-there__section-title">
          Main airports
        </h3>
        <ul className="wtr-getting-there__airports">
          {data.main_airports.map((airport) => (
            <li key={`${airport.code}-${airport.city}`} className="wtr-getting-there__airport">
              <span className="wtr-getting-there__iata">{airport.code}</span>
              <span className="wtr-getting-there__airport-copy">
                <span className="wtr-getting-there__airport-name">{airport.name}</span>
                <span className="wtr-getting-there__airport-city">{airport.city}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="wtr-getting-there__group"
        aria-labelledby="wtr-getting-there-flights-heading"
        {...staggerSectionProps(1, 'wtr-getting-there__group', staggerClassName, staggerStyle)}
      >
        <h3 id="wtr-getting-there-flights-heading" className="wtr-getting-there__section-title">
          Flights from the US
        </h3>
        <DirectFlightsBadge direct={data.direct_from_us} />
        {data.direct_from_us ? (
          <div className="wtr-getting-there__city-pills">
            {data.direct_us_cities.map((city) => (
              <span key={city} className="wtr-getting-there__city-pill">
                {city}
              </span>
            ))}
          </div>
        ) : (
          <p className="wtr-getting-there__connection-note">{formatAirlinesList(data.airlines)}</p>
        )}
      </section>

      <div
        className="wtr-getting-there__flight-metrics"
        {...staggerSectionProps(2, 'wtr-getting-there__flight-metrics', staggerClassName, staggerStyle)}
      >
        <article className="wtr-getting-there__metric-card">
          <IconPlane className="wtr-getting-there__metric-icon" size={18} stroke={1.5} aria-hidden />
          <p className="wtr-getting-there__metric-label">From East Coast</p>
          <p className="wtr-getting-there__metric-value tabular-nums">
            {formatFlightHours(data.flight_time_hours.east_coast)}
            <span className="wtr-getting-there__metric-unit"> hrs</span>
          </p>
        </article>
        <article className="wtr-getting-there__metric-card">
          <IconPlane className="wtr-getting-there__metric-icon" size={18} stroke={1.5} aria-hidden />
          <p className="wtr-getting-there__metric-label">From West Coast</p>
          <p className="wtr-getting-there__metric-value tabular-nums">
            {formatFlightHours(data.flight_time_hours.west_coast)}
            <span className="wtr-getting-there__metric-unit"> hrs</span>
          </p>
        </article>
      </div>

      <section
        className="wtr-getting-there__group"
        aria-labelledby="wtr-getting-there-airlines-heading"
        {...staggerSectionProps(3, 'wtr-getting-there__group', staggerClassName, staggerStyle)}
      >
        <h3 id="wtr-getting-there-airlines-heading" className="wtr-getting-there__section-title">
          Airlines serving this route
        </h3>
        <p className="wtr-getting-there__airlines-list">{formatAirlinesList(data.airlines)}</p>
      </section>

      <aside
        className="wtr-getting-there__tip"
        {...staggerSectionProps(4, 'wtr-getting-there__tip', staggerClassName, staggerStyle)}
      >
        <IconBulb className="wtr-getting-there__tip-icon" size={18} stroke={1.5} aria-hidden />
        <div className="wtr-getting-there__tip-copy">
          <p className="wtr-getting-there__tip-label">Booking tip</p>
          <p className="wtr-getting-there__tip-value">{data.best_booking_tip}</p>
        </div>
      </aside>

      <p
        className="wtr-getting-there__visa-note"
        {...staggerSectionProps(5, 'wtr-getting-there__visa-note', staggerClassName, staggerStyle)}
      >
        {formatVisaFreeEntryNote(data.visa_free_days)}
      </p>

      <a
        className="wtr-getting-there__flights-link"
        href={flightsUrl}
        target="_blank"
        rel="noopener noreferrer"
        {...staggerSectionProps(6, 'wtr-getting-there__flights-link', staggerClassName, staggerStyle)}
      >
        Search flights on Google Flights →
      </a>

      <p {...staggerSectionProps(7, 'wtr-dest-panel__data-source', staggerClassName, staggerStyle)}>
        {GETTING_THERE_TAB_SOURCE_FOOTER}
      </p>
    </div>
  )
}
