import { useMemo, type CSSProperties } from 'react'
import {
  DEMOGRAPHICS_TAB_SOURCE_FOOTER,
  DEMOGRAPHICS_UNAVAILABLE_MESSAGE,
  getDemographicsData,
  getEnglishProficiencyTone,
  getReligionBarSegments,
  getReligionLegendItems,
} from '../../utils/demographics'
import './DestinationPeopleCultureTab.scss'

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

export function EnglishProficiencyBadge({ level }: { level: string }) {
  const tone = getEnglishProficiencyTone(level)
  return (
    <span className={`wtr-people-culture__english-badge wtr-people-culture__english-badge--${tone}`}>
      {level}
    </span>
  )
}

function ReligionStackedBar({ breakdown }: { breakdown: Record<string, number> }) {
  const segments = getReligionBarSegments(breakdown)
  if (!segments.length) return null

  return (
    <div
      className="wtr-people-culture__religion-bar"
      role="img"
      aria-label={segments.map((s) => `${s.key} ${s.pct}%`).join(', ')}
    >
      {segments.map((seg) => (
        <span
          key={seg.key}
          className={`wtr-people-culture__religion-segment wtr-people-culture__religion-segment--${seg.key.toLowerCase()}`}
          style={{ width: `${seg.pct}%` }}
          title={`${seg.key} ${seg.pct}%`}
        />
      ))}
    </div>
  )
}

function ReligionLegend({ breakdown }: { breakdown: Record<string, number> }) {
  const items = getReligionLegendItems(breakdown)
  if (!items.length) return null

  return (
    <ul className="wtr-people-culture__legend">
      {items.map((item) => (
        <li key={item.key} className="wtr-people-culture__legend-item">
          <span
            className={`wtr-people-culture__legend-dot wtr-people-culture__legend-dot--${item.key.toLowerCase()}`}
            aria-hidden
          />
          <span className="wtr-people-culture__legend-label">
            {item.key} <span className="tabular-nums">{item.pct}%</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function DestinationPeopleCultureTab({ country, staggerClassName, staggerStyle }: Props) {
  const data = useMemo(() => getDemographicsData(country), [country])

  if (!data) {
    return (
      <p
        className="wtr-people-culture__empty"
        {...staggerSectionProps(0, 'wtr-people-culture__empty', staggerClassName, staggerStyle)}
      >
        {DEMOGRAPHICS_UNAVAILABLE_MESSAGE}
      </p>
    )
  }

  const { religion, demographics } = data

  return (
    <div className="wtr-people-culture">
      <section
        className="wtr-people-culture__group"
        aria-labelledby="wtr-people-culture-religion-heading"
        {...staggerSectionProps(0, 'wtr-people-culture__group', staggerClassName, staggerStyle)}
      >
        <h3 id="wtr-people-culture-religion-heading" className="wtr-people-culture__section-title">
          Religion
        </h3>
        <p className="wtr-people-culture__dominant">{religion.dominant}</p>
        <p className="wtr-people-culture__dominant-note">{religion.christian_note}</p>
        <ReligionStackedBar breakdown={religion.breakdown} />
        <ReligionLegend breakdown={religion.breakdown} />
        <p className="wtr-people-culture__worship-note">
          <em>Places of worship for expats:</em> {religion.expat_worship}
        </p>
      </section>

      <section
        className="wtr-people-culture__group"
        aria-labelledby="wtr-people-culture-demo-heading"
        {...staggerSectionProps(1, 'wtr-people-culture__group', staggerClassName, staggerStyle)}
      >
        <h3 id="wtr-people-culture-demo-heading" className="wtr-people-culture__section-title">
          People &amp; language
        </h3>
        <dl className="wtr-people-culture__rows">
          <div className="wtr-people-culture__row">
            <dt>Population</dt>
            <dd>{demographics.population}</dd>
          </div>
          <div className="wtr-people-culture__row">
            <dt>Median age</dt>
            <dd>
              <span className="tabular-nums">{demographics.median_age}</span> years
            </dd>
          </div>
          <div className="wtr-people-culture__row">
            <dt>Urban population</dt>
            <dd>
              <span className="tabular-nums">{demographics.urban_pct}</span>%
            </dd>
          </div>
          <div className="wtr-people-culture__row">
            <dt>Official language</dt>
            <dd>{demographics.official_language}</dd>
          </div>
          <div className="wtr-people-culture__row">
            <dt>Common languages</dt>
            <dd>{demographics.common_languages}</dd>
          </div>
          <div className="wtr-people-culture__row wtr-people-culture__row--badge">
            <dt>English proficiency</dt>
            <dd>
              <EnglishProficiencyBadge level={demographics.english_proficiency} />
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="wtr-people-culture__group"
        aria-labelledby="wtr-people-culture-expat-heading"
        {...staggerSectionProps(2, 'wtr-people-culture__group', staggerClassName, staggerStyle)}
      >
        <h3 id="wtr-people-culture-expat-heading" className="wtr-people-culture__section-title">
          Expat community
        </h3>
        <p className="wtr-people-culture__expat-copy">{demographics.expat_population}</p>
      </section>

      <p
        className="wtr-dest-panel__data-source"
        {...staggerSectionProps(3, 'wtr-dest-panel__data-source', staggerClassName, staggerStyle)}
      >
        {DEMOGRAPHICS_TAB_SOURCE_FOOTER}
      </p>
    </div>
  )
}
