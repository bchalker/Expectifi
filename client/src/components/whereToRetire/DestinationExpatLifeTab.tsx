import { useMemo, type CSSProperties } from 'react'
import { IconAlertCircle, IconExternalLink } from '@tabler/icons-react'
import {
  expatCommunitySizeTone,
  expatUnavailableMessage,
  facebookGroupSearchUrl,
  formatEstimatedAmericans,
  forumLinkHref,
  getExpatDestinationInfo,
  isDomesticRetirementDestination,
} from '../../utils/expatInfo'
import './DestinationExpatLifeTab.scss'

const POPULAR_AREAS_MAX = 4
const INTERNATIONS_URL = 'https://www.internations.org/'

type Props = {
  city: string
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

export function DestinationExpatLifeTab({
  city,
  country,
  staggerClassName,
  staggerStyle,
}: Props) {
  const data = useMemo(() => getExpatDestinationInfo(country), [country])

  if (isDomesticRetirementDestination(country)) {
    return (
      <p {...staggerSectionProps(0, 'wtr-expat-life__empty', staggerClassName, staggerStyle)}>
        {city} is a domestic US retirement destination. Expat community data applies to
        international relocations — use Best overall fit or Lowest cost views to compare US
        cities.
      </p>
    )
  }

  if (!data) {
    return (
      <p {...staggerSectionProps(0, 'wtr-expat-life__empty', staggerClassName, staggerStyle)}>
        {expatUnavailableMessage(city)}
      </p>
    )
  }

  const tone = expatCommunitySizeTone(data.community_size)
  const americansNote = formatEstimatedAmericans(data.estimated_americans)
  const visibleAreas = data.popular_areas.slice(0, POPULAR_AREAS_MAX)
  const moreAreas = data.popular_areas.length - visibleAreas.length

  let sectionIndex = 0

  return (
    <div className="wtr-expat-life">
      <section
        className="wtr-expat-life__group"
        {...staggerSectionProps(
          sectionIndex++,
          'wtr-expat-life__group',
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3 className="wtr-city-detail__section-title wtr-expat-life__section-title">Community</h3>
        <div className="wtr-expat-life__community-row">
          <span className={`wtr-expat-life__size-badge wtr-expat-life__size-badge--${tone}`}>
            {data.community_size}
          </span>
          {americansNote ? (
            <span className="wtr-expat-life__americans">{americansNote}</span>
          ) : null}
        </div>
      </section>

      {visibleAreas.length > 0 ? (
        <section
          className="wtr-expat-life__group"
          {...staggerSectionProps(
            sectionIndex++,
            'wtr-expat-life__group',
            staggerClassName,
            staggerStyle,
          )}
        >
          <h3 className="wtr-city-detail__section-title wtr-expat-life__section-title">Popular expat areas</h3>
          <div className="wtr-expat-life__area-pills">
            {visibleAreas.map((area) => (
              <span key={area} className="wtr-expat-life__area-pill">
                {area}
              </span>
            ))}
            {moreAreas > 0 ? (
              <span className="wtr-expat-life__area-pill wtr-expat-life__area-pill--more">
                +{moreAreas} more
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      <section
        className="wtr-expat-life__group"
        {...staggerSectionProps(
          sectionIndex++,
          'wtr-expat-life__group',
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3 className="wtr-city-detail__section-title wtr-expat-life__section-title">What expats say</h3>
        <blockquote className="wtr-expat-life__vibe">{data.expat_vibe}</blockquote>
      </section>

      <dl className="wtr-expat-life__rows">
        <div className="wtr-expat-life__row">
          <dt>Day-to-day language</dt>
          <dd>{data.language_barrier}</dd>
        </div>
        <div className="wtr-expat-life__row">
          <dt>Healthcare for expats</dt>
          <dd>{data.healthcare_expat}</dd>
        </div>
      </dl>

      <section
        className="wtr-expat-life__group"
        {...staggerSectionProps(
          sectionIndex++,
          'wtr-expat-life__group',
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3 className="wtr-city-detail__section-title wtr-expat-life__section-title">Cost reality check</h3>
        <div className="wtr-expat-life__cost-callout" role="note">
          <IconAlertCircle size={18} stroke={1.5} className="wtr-expat-life__cost-icon" aria-hidden />
          <p>{data.cost_note}</p>
        </div>
      </section>

      <section
        className="wtr-expat-life__group"
        {...staggerSectionProps(
          sectionIndex++,
          'wtr-expat-life__group',
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3 className="wtr-city-detail__section-title wtr-expat-life__section-title">Connect with the community</h3>
        <ul className="wtr-expat-life__fb-list">
          {data.facebook_groups.map((group) => (
            <li key={group}>
              <a
                href={facebookGroupSearchUrl(group)}
                target="_blank"
                rel="noopener noreferrer"
                className="wtr-expat-life__fb-link"
              >
                {group} on Facebook
                <IconExternalLink size={14} stroke={1.5} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
        {data.forums.length > 0 ? (
          <ul className="wtr-expat-life__forum-list">
            {data.forums.map((forum) => (
              <li key={forum}>
                <a
                  href={forumLinkHref(forum)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wtr-expat-life__forum-link"
                >
                  {forum}
                  <IconExternalLink size={14} stroke={1.5} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {data.internations_chapter ? (
          <a
            href={INTERNATIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="wtr-expat-life__internations-badge"
          >
            InterNations chapter active
            <IconExternalLink size={14} stroke={1.5} aria-hidden />
          </a>
        ) : null}
      </section>
    </div>
  )
}
