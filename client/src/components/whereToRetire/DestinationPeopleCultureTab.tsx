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
          <div className="wtr-people-culture__religion-summary">
            <p className="wtr-people-culture__dominant">{religion.dominant}</p>
            <p className="wtr-people-culture__dominant-note">
              {religion.christian_note}
            </p>
            <p className="wtr-people-culture__worship-note">
              <em>Places of worship for expats:</em> {religion.expat_worship}
            </p>
          </div>
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
          <div className="wtr-people-culture__demo-overview">
            <div className="wtr-people-culture__demo-stats">
              <div className="wtr-people-culture__demo-stat wtr-people-culture__demo-stat--start">
                <span className="wtr-people-culture__demo-stat-label">Population</span>
                <span className="wtr-people-culture__demo-stat-value">
                  {demographics.population}
                </span>
              </div>
              <div className="wtr-people-culture__demo-stat wtr-people-culture__demo-stat--center">
                <span className="wtr-people-culture__demo-stat-label">Urban</span>
                <span className="wtr-people-culture__demo-stat-value tabular-nums">
                  {demographics.urban_pct}%
                </span>
              </div>
              <div className="wtr-people-culture__demo-stat wtr-people-culture__demo-stat--end">
                <span className="wtr-people-culture__demo-stat-label">Median Age</span>
                <span className="wtr-people-culture__demo-stat-value tabular-nums">
                  {demographics.median_age}
                </span>
              </div>
            </div>
            <div className="wtr-people-culture__demo-age-callout">
              <p className="wtr-people-culture__demo-age-headline">
                {medianAgeInterpretation(demographics.median_age)}
              </p>
              <NarrativeWhyLine className="wtr-people-culture__demo-callout">
                {medianAgeWhy(demographics.median_age)}
              </NarrativeWhyLine>
            </div>
          </div>
          <div className="wtr-people-culture__demo-language-group">
            <p className="wtr-people-culture__demo-inline-row">
              <strong>Official Language:</strong> {demographics.official_language}
            </p>
            <div className="wtr-people-culture__demo-block">
              <p className="wtr-people-culture__demo-block-title">
                <strong>Common Languages</strong>
              </p>
              <p className="wtr-people-culture__demo-block-body">
                {demographics.common_languages}
              </p>
              <NarrativeWhyLine className="wtr-people-culture__demo-callout">
                {demographics.common_languages_why}
              </NarrativeWhyLine>
            </div>
            {englishLevel ? (
              <div className="wtr-people-culture__demo-block">
                <p className="wtr-people-culture__demo-inline-row">
                  <strong>English Proficiency:</strong>{" "}
                  {getEnglishProficiencyBadgeLabel(englishLevel)}
                </p>
                <p className="wtr-people-culture__demo-block-body">
                  {getEnglishProficiencyWhy(englishLevel)}
                </p>
              </div>
            ) : null}
          </div>
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
