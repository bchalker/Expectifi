import { useMemo, type CSSProperties } from "react";
import {
  DEMOGRAPHICS_UNAVAILABLE_MESSAGE,
  getDemographicsData,
  getDemographicsPanelHeadsUp,
  getReligionBarSegments,
  getReligionLegendItems,
  medianAgeWhy,
} from "../../utils/demographics";
import {
  getEnglishProficiency,
  getEnglishProficiencyBadgeLabel,
  getEnglishProficiencyTone,
  getEnglishProficiencyWhy,
  type EnglishProficiencyLevel,
} from "../../utils/englishProficiency";
import { getCountryPreferenceFields } from "../../utils/countryPreferenceData";
import { NarrativeWhyLine } from "../ui/NarrativeWhyLine";
import { PanelHeadsUpCallout } from "../ui/PanelHeadsUpCallout";
import "../ui/DetailPanelCard.scss";
import "./DestinationPeopleCultureTab.scss";

function socialLawDisclosureLabels(country: string): string[] {
  const fields = getCountryPreferenceFields(country);
  const labels: string[] = [];
  if (fields.alcohol_restricted) labels.push("Alcohol restricted");
  if (fields.dress_code_enforced) labels.push("Dress code enforced");
  if (fields.religious_law_basis) labels.push("Religious law basis");
  return labels;
}

type Props = {
  country: string;
  staggerClassName?: string;
  staggerStyle?: (index: number) => CSSProperties;
};

function staggerSectionProps(
  index: number,
  baseClass: string | undefined,
  staggerClassName: string | undefined,
  staggerStyle: ((index: number) => CSSProperties) | undefined,
): { className?: string; style?: CSSProperties } {
  if (!staggerClassName || !staggerStyle) {
    return baseClass ? { className: baseClass } : {};
  }
  return {
    className: baseClass
      ? `${baseClass} ${staggerClassName}`
      : staggerClassName,
    style: staggerStyle(index),
  };
}

export function EnglishProficiencyBadge({
  level,
}: {
  level: EnglishProficiencyLevel;
}) {
  const tone = getEnglishProficiencyTone(level);
  const label = getEnglishProficiencyBadgeLabel(level);
  return (
    <span
      className={`wtr-people-culture__english-badge wtr-people-culture__english-badge--${tone}`}
    >
      {label}
    </span>
  );
}

function ReligionStackedBar({
  breakdown,
}: {
  breakdown: Record<string, number>;
}) {
  const segments = getReligionBarSegments(breakdown);
  if (!segments.length) return null;

  return (
    <div
      className="wtr-people-culture__religion-bar"
      role="img"
      aria-label={segments.map((s) => `${s.key} ${s.pct}%`).join(", ")}
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
  );
}

function ReligionLegend({ breakdown }: { breakdown: Record<string, number> }) {
  const items = getReligionLegendItems(breakdown);
  if (!items.length) return null;

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
  );
}

function ReligionBreakdown({
  breakdown,
}: {
  breakdown: Record<string, number>;
}) {
  return (
    <div className="wtr-people-culture__religion-breakdown">
      <ReligionStackedBar breakdown={breakdown} />
      <ReligionLegend breakdown={breakdown} />
    </div>
  );
}

function medianAgeInterpretation(age: number): string {
  if (age < 35) return "Young population — fewer expat retirees";
  if (age <= 50) return "Mixed age population";
  return "Older population — more retirees nearby";
}

export function DestinationPeopleCultureTab({
  country,
  staggerClassName,
  staggerStyle,
}: Props) {
  const data = useMemo(() => getDemographicsData(country), [country]);
  const englishLevel = useMemo(() => getEnglishProficiency(country), [country]);
  const socialDisclosures = useMemo(
    () => socialLawDisclosureLabels(country),
    [country],
  );
  const panelHeadsUp = useMemo(() => getDemographicsPanelHeadsUp(data), [data]);

  if (!data && !englishLevel) {
    return (
      <p
        {...staggerSectionProps(
          0,
          "wtr-people-culture__empty",
          staggerClassName,
          staggerStyle,
        )}
      >
        {DEMOGRAPHICS_UNAVAILABLE_MESSAGE}
      </p>
    );
  }

  const religion = data?.religion;
  const demographics = data?.demographics;
  let sectionIndex = 0;

  return (
    <div className="wtr-people-culture">
      {socialDisclosures.length > 0 ? (
        <div
          className="wtr-people-culture__social-disclosures"
          {...staggerSectionProps(
            (() => {
              const idx = sectionIndex;
              sectionIndex += 1;
              return idx;
            })(),
            undefined,
            staggerClassName,
            staggerStyle,
          )}
        >
          {socialDisclosures.map((label) => (
            <span key={label} className="wtr-people-culture__social-badge">
              {label}
            </span>
          ))}
        </div>
      ) : null}
      {religion ? (
        <section
          aria-labelledby="wtr-people-culture-religion-heading"
          {...staggerSectionProps(
            sectionIndex++,
            "detail-panel-card wtr-people-culture__group",
            staggerClassName,
            staggerStyle,
          )}
        >
          <h3
            id="wtr-people-culture-religion-heading"
            className="wtr-city-detail__section-title wtr-people-culture__section-title"
          >
            Religion
          </h3>
          <ReligionBreakdown breakdown={religion.breakdown} />
          <p className="wtr-people-culture__dominant">{religion.dominant}</p>
          <p className="wtr-people-culture__dominant-note">
            {religion.christian_note}
          </p>
          <p className="wtr-people-culture__worship-note">
            <em>Places of worship for expats:</em> {religion.expat_worship}
          </p>
          <NarrativeWhyLine className="wtr-people-culture__why">
            {religion.expat_worship_why}
          </NarrativeWhyLine>
        </section>
      ) : null}

      {demographics ? (
        <section
          aria-labelledby="wtr-people-culture-demo-heading"
          {...staggerSectionProps(
            sectionIndex++,
            "detail-panel-card wtr-people-culture__group wtr-people-culture__demographics",
            staggerClassName,
            staggerStyle,
          )}
        >
          <h3
            id="wtr-people-culture-demo-heading"
            className="wtr-city-detail__section-title wtr-people-culture__section-title"
          >
            Demographics
          </h3>
          <dl className="wtr-people-culture__demo-grid">
            <div className="wtr-people-culture__demo-cell">
              <dt className="font-xs">Population</dt>
              <dd className="font-base">{demographics.population}</dd>
            </div>
            <div className="wtr-people-culture__demo-cell">
              <dt className="font-xs">Median age</dt>
              <dd className="font-base">
                <span className="tabular-nums">{demographics.median_age}</span>{" "}
                years
                <span className="wtr-people-culture__age-note">
                  {medianAgeInterpretation(demographics.median_age)}
                </span>
                <NarrativeWhyLine className="wtr-people-culture__why">
                  {medianAgeWhy(demographics.median_age)}
                </NarrativeWhyLine>
              </dd>
            </div>
            <div className="wtr-people-culture__demo-cell">
              <dt className="font-xs">Urban population</dt>
              <dd className="font-base">
                <span className="tabular-nums">{demographics.urban_pct}</span>%
              </dd>
            </div>
            <div className="wtr-people-culture__demo-cell">
              <dt className="font-xs">Official language</dt>
              <dd className="font-base">{demographics.official_language}</dd>
            </div>
            <div className="wtr-people-culture__demo-cell wtr-people-culture__demo-cell--wide">
              <dt className="font-xs">Common languages</dt>
              <dd className="font-base">{demographics.common_languages}</dd>
              <NarrativeWhyLine className="wtr-people-culture__why">
                {demographics.common_languages_why}
              </NarrativeWhyLine>
            </div>
            {englishLevel ? (
              <div className="wtr-people-culture__demo-cell">
                <dt className="font-xs">English proficiency</dt>
                <dd className="font-base">
                  <EnglishProficiencyBadge level={englishLevel} />
                </dd>
                <NarrativeWhyLine className="wtr-people-culture__why">
                  {getEnglishProficiencyWhy(englishLevel)}
                </NarrativeWhyLine>
              </div>
            ) : null}
          </dl>
        </section>
      ) : englishLevel ? (
        <section
          className="wtr-people-culture__group"
          aria-labelledby="wtr-people-culture-english-heading"
          {...staggerSectionProps(
            sectionIndex++,
            "wtr-people-culture__group",
            staggerClassName,
            staggerStyle,
          )}
        >
          <h3
            id="wtr-people-culture-english-heading"
            className="wtr-city-detail__section-title wtr-people-culture__section-title"
          >
            English
          </h3>
          <EnglishProficiencyBadge level={englishLevel} />
          <NarrativeWhyLine className="wtr-people-culture__why">
            {getEnglishProficiencyWhy(englishLevel)}
          </NarrativeWhyLine>
        </section>
      ) : null}

      {demographics ? (
        <section
          aria-labelledby="wtr-people-culture-expat-heading"
          {...staggerSectionProps(
            sectionIndex++,
            "detail-panel-card wtr-people-culture__group",
            staggerClassName,
            staggerStyle,
          )}
        >
          <h3
            id="wtr-people-culture-expat-heading"
            className="wtr-city-detail__section-title wtr-people-culture__section-title"
          >
            Expat community
          </h3>
          <p className="wtr-people-culture__expat-copy">
            {demographics.expat_population}
          </p>
          <NarrativeWhyLine className="wtr-people-culture__why">
            {demographics.expat_population_why}
          </NarrativeWhyLine>
        </section>
      ) : null}

      <PanelHeadsUpCallout
        className="wtr-people-culture__heads-up"
        {...staggerSectionProps(
          sectionIndex++,
          undefined,
          staggerClassName,
          staggerStyle,
        )}
      >
        {panelHeadsUp}
      </PanelHeadsUpCallout>
    </div>
  );
}
