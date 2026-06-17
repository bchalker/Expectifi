import { useMemo, type CSSProperties } from 'react'
import { IconBulb } from '@tabler/icons-react'
import {
  formatAirlinesList,
  formatDirectUsCityDisplay,
  formatEstimatedFlightHours,
  formatFlightDistanceMiles,
  formatRoutesVerifiedCaption,
  getDirectUsCityFlightHours,
  formatVisaFreeEntryNote,
  getDirectUsHubIata,
  getDirectUsCityDistanceMiles,
  getPrimaryAirportCode,
  GETTING_THERE_TAB_SOURCE_FOOTER,
  GETTING_THERE_UNAVAILABLE_MESSAGE,
  getGettingThereData,
  googleFlightsRouteSearchUrl,
  googleFlightsSearchUrl,
  parseAirlineRoute,
  type GettingThereAirport,
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

function FlightsFromUsHelper({ direct }: { direct: boolean }) {
  return (
    <p
      className={[
        'wtr-getting-there__section-helper',
        direct
          ? 'wtr-getting-there__section-helper--direct'
          : 'wtr-getting-there__section-helper--connect',
      ].join(' ')}
    >
      {direct ? 'Direct flights available' : 'Connection required'}
    </p>
  )
}

function AirlineRouteItem({ entry }: { entry: string }) {
  const { airline, via } = parseAirlineRoute(entry)
  return (
    <li className="wtr-getting-there__airline-route">
      {via ? (
        <>
          {airline}{' '}
          <strong className="wtr-getting-there__airline-via">via {via}</strong>
        </>
      ) : (
        airline
      )}
    </li>
  )
}

function DirectUsCityItem({
  city,
  destinationAirportCode,
}: {
  city: string
  destinationAirportCode: string | null
}) {
  const { city: label, iata: displayIata } = formatDirectUsCityDisplay(city)
  const originIata = getDirectUsHubIata(city)
  const distanceMiles = getDirectUsCityDistanceMiles(city, destinationAirportCode)
  const flightHours = getDirectUsCityFlightHours(city, destinationAirportCode)
  const flightsUrl =
    originIata && destinationAirportCode
      ? googleFlightsRouteSearchUrl(originIata, destinationAirportCode)
      : null

  return (
    <li className="wtr-getting-there__us-city">
      <span className="wtr-getting-there__us-city-label">
        {label}
        {displayIata ? (
          <span className="wtr-getting-there__us-city-iata tabular-nums"> ({displayIata})</span>
        ) : null}
      </span>
      <span className="wtr-getting-there__us-city-meta">
        {flightHours != null ? (
          <span className="wtr-getting-there__us-city-duration font-xs tabular-nums">
            {formatEstimatedFlightHours(flightHours)}
          </span>
        ) : null}
        {distanceMiles != null ? (
          <span className="wtr-getting-there__us-city-distance font-xs tabular-nums">
            {formatFlightDistanceMiles(distanceMiles)}
          </span>
        ) : null}
        {flightsUrl ? (
          <a
            className="wtr-getting-there__us-city-search font-xs"
            href={flightsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Search flights
          </a>
        ) : null}
      </span>
    </li>
  )
}

function AirportRow({
  airport,
  isPrimary,
  showPrimaryBadge,
}: {
  airport: GettingThereAirport
  isPrimary: boolean
  showPrimaryBadge: boolean
}) {
  return (
    <li
      className={[
        'wtr-getting-there__airport',
        isPrimary && showPrimaryBadge && 'wtr-getting-there__airport--primary',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="wtr-getting-there__airport-body">
        <p className="wtr-getting-there__airport-name">{airport.name}</p>
        {showPrimaryBadge && isPrimary ? (
          <p className="wtr-getting-there__airport-primary-helper font-xs">Primary</p>
        ) : null}
      </div>
      <footer className="wtr-getting-there__airport-footer">
        <span className="wtr-getting-there__airport-city">{airport.city}</span>
        <span className="wtr-getting-there__airport-code tabular-nums">{airport.code}</span>
      </footer>
    </li>
  )
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
  const destinationAirportCode = getPrimaryAirportCode(data)
  const countableAirports = data.main_airports.filter(
    (airport) => airport.code?.trim() && airport.code.toLowerCase() !== 'various',
  )
  const showPrimaryAirportBadge = countableAirports.length > 1

  return (
    <div className="wtr-getting-there">
      <section
        className="wtr-getting-there__group"
        aria-labelledby="wtr-getting-there-airports-heading"
        {...staggerSectionProps(0, 'wtr-getting-there__group', staggerClassName, staggerStyle)}
      >
        <h3
          id="wtr-getting-there-airports-heading"
          className="wtr-city-detail__section-title wtr-getting-there__section-title"
        >
          Main airports
        </h3>
        <ul className="wtr-getting-there__airports">
          {data.main_airports.map((airport, index) => {
            const code = airport.code?.trim().toUpperCase()
            const isPrimary = destinationAirportCode
              ? code === destinationAirportCode.toUpperCase()
              : index === 0
            return (
              <AirportRow
                key={`${airport.code}-${airport.city}`}
                airport={airport}
                isPrimary={isPrimary}
                showPrimaryBadge={showPrimaryAirportBadge}
              />
            )
          })}
        </ul>
      </section>

      <section
        className="wtr-getting-there__group wtr-getting-there__flights-block"
        aria-labelledby="wtr-getting-there-flights-heading"
        {...staggerSectionProps(1, 'wtr-getting-there__group', staggerClassName, staggerStyle)}
      >
        <div className="wtr-getting-there__section-header">
          <h3
            id="wtr-getting-there-flights-heading"
            className="wtr-city-detail__section-title wtr-getting-there__section-title"
          >
            Flights from the US
          </h3>
          <FlightsFromUsHelper direct={data.direct_from_us} />
          {data._verified_at ? (
            <p className="wtr-getting-there__verified-caption font-xs">
              Routes verified {formatRoutesVerifiedCaption(data._verified_at)}
            </p>
          ) : null}
        </div>
        {data.direct_from_us ? (
          <ul className="wtr-getting-there__us-cities">
            {data.direct_us_cities.map((city) => (
              <DirectUsCityItem
                key={city}
                city={city}
                destinationAirportCode={destinationAirportCode}
              />
            ))}
          </ul>
        ) : (
          <ul className="wtr-getting-there__airline-routes">
            {data.airlines.map((entry) => (
              <AirlineRouteItem key={entry} entry={entry} />
            ))}
          </ul>
        )}
      </section>

      <section
        className="wtr-getting-there__group"
        aria-labelledby="wtr-getting-there-airlines-heading"
        {...staggerSectionProps(2, 'wtr-getting-there__group', staggerClassName, staggerStyle)}
      >
        <h3
          id="wtr-getting-there-airlines-heading"
          className="wtr-city-detail__section-title wtr-getting-there__section-title"
        >
          Airlines serving this route
        </h3>
        <p className="wtr-getting-there__airlines-list">{formatAirlinesList(data.airlines)}</p>
      </section>

      <aside
        className="wtr-getting-there__tip"
        {...staggerSectionProps(3, 'wtr-getting-there__tip', staggerClassName, staggerStyle)}
      >
        <IconBulb className="wtr-getting-there__tip-icon" size={18} stroke={1.5} aria-hidden />
        <div className="wtr-getting-there__tip-copy">
          <p className="wtr-getting-there__tip-label">Booking tip</p>
          <p className="wtr-getting-there__tip-value">{data.best_booking_tip}</p>
        </div>
      </aside>

      <p
        className="wtr-getting-there__visa-note"
        {...staggerSectionProps(4, 'wtr-getting-there__visa-note', staggerClassName, staggerStyle)}
      >
        {formatVisaFreeEntryNote(data.visa_free_days)}
      </p>

      <a
        className="wtr-getting-there__flights-link"
        href={flightsUrl}
        target="_blank"
        rel="noopener noreferrer"
        {...staggerSectionProps(5, 'wtr-getting-there__flights-link', staggerClassName, staggerStyle)}
      >
        Search flights on Google Flights →
      </a>

      <p {...staggerSectionProps(6, 'wtr-dest-panel__data-source', staggerClassName, staggerStyle)}>
        {GETTING_THERE_TAB_SOURCE_FOOTER}
      </p>
    </div>
  )
}
