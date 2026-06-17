import { useMemo, type CSSProperties } from "react";
import {
  DEMOGRAPHICS_UNAVAILABLE_MESSAGE,
  demographicsCityUnavailableBody,
  demographicsCityUnavailableTitle,
  demographicsCountryFallbackLabel,
  formatCompactDemographicNumber,
  getDemographicsData,
  getDemographicsPanelHeadsUp,
  getReligionBarSegments,
  getReligionLegendItems,
  medianAgeWhy,
  parseCompactDemographicNumber,
  peopleCultureCountryScopeHelper,
  religionCityUnavailableBody,
  religionCityUnavailableTitle,
} from "../../utils/demographics";
import {
  getEnglishProficiency,
  getEnglishProficiencyBadgeLabel,
  getEnglishProficiencyTone,
  getEnglishProficiencyWhy,
  type EnglishProficiencyLevel,
} from "../../utils/englishProficiency";
import { getCountryPreferenceFields } from "../../utils/countryPreferenceData";
import {
  scaledMetricValue,
  usePeopleCultureMetricsAnimation,
} from "../../hooks/usePeopleCultureMetricsAnimation";
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
  city: string;
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

function DemographicsDataEmptyCard({
  city,
  country,
  showCountryFallback,
  onShowCountryFallback,
}: {
  city: string;
  country: string;
  showCountryFallback: boolean;
  onShowCountryFallback: () => void;
}) {
  return (
    <section className="detail-panel-card wtr-people-culture__group wtr-people-culture__data-empty">
      <h3 className="wtr-people-culture__data-empty-title">
        {demographicsCityUnavailableTitle()}
      </h3>
      <p className="wtr-people-culture__data-empty-body">
        {demographicsCityUnavailableBody(city)}
      </p>
      {showCountryFallback ? (
        <button
          type="button"
          className="wtr-people-culture__country-fallback"
          onClick={onShowCountryFallback}
        >
          {demographicsCountryFallbackLabel(country)}
        </button>
      ) : null}
    </section>
  );
}

function ReligionDataEmptyCard({ city }: { city: string }) {
  return (
    <section className="detail-panel-card wtr-people-culture__group wtr-people-culture__data-empty">
      <h3 className="wtr-people-culture__data-empty-title">
        {religionCityUnavailableTitle()}
      </h3>
      <p className="wtr-people-culture__data-empty-body">
        {religionCityUnavailableBody(city)}
      </p>
    </section>
  );
}

function EnglishProficiencySection({
  level,
  staggerIndex,
  staggerClassName,
  staggerStyle,
}: {
  level: EnglishProficiencyLevel;
  staggerIndex: number;
  staggerClassName?: string;
  staggerStyle?: (index: number) => CSSProperties;
}) {
  return (
    <section
      aria-labelledby="wtr-people-culture-english-heading"
      {...staggerSectionProps(
        staggerIndex,
        "detail-panel-card wtr-people-culture__group wtr-people-culture__english",
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
      <p className="wtr-people-culture__english-level">
        {getEnglishProficiencyBadgeLabel(level)}
      </p>
      <NarrativeWhyLine className="wtr-people-culture__demo-callout">
        {getEnglishProficiencyWhy(level)}
      </NarrativeWhyLine>
    </section>
  );
}

function PeopleCultureSectionHeader({
  id,
  title,
  country,
}: {
  id: string;
  title: string;
  country: string;
}) {
  return (
    <div className="wtr-people-culture__section-header">
      <h3
        id={id}
        className="wtr-city-detail__section-title wtr-people-culture__section-title"
      >
        {title}
      </h3>
      <p className="wtr-people-culture__section-helper">
        {peopleCultureCountryScopeHelper(country)}
      </p>
    </div>
  );
}

function ReligionStackedBar({
  breakdown,
  revealed,
}: {
  breakdown: Record<string, number>;
  revealed: boolean;
}) {
  const segments = getReligionBarSegments(breakdown);
  if (!segments.length) return null;

  return (
    <div
      className={[
        "wtr-people-culture__religion-bar",
        revealed && "wtr-people-culture__religion-bar--revealed",
      ]
        .filter(Boolean)
        .join(" ")}
      role="img"
      aria-label={segments.map((s) => `${s.key} ${s.pct}%`).join(", ")}
    >
      {segments.map((seg) => (
        <span
          key={seg.key}
          className={`wtr-people-culture__religion-segment wtr-people-culture__religion-segment--${seg.key.toLowerCase()}`}
          style={{ "--segment-target": `${seg.pct}%` } as CSSProperties}
          title={`${seg.key} ${seg.pct}%`}
        />
      ))}
    </div>
  );
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
  revealed,
}: {
  breakdown: Record<string, number>;
  revealed: boolean;
}) {
  return (
    <div className="wtr-people-culture__religion-breakdown">
      <ReligionStackedBar breakdown={breakdown} revealed={revealed} />
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
  city,
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
  const metricsAnimationKey = `${city}|${country}`;
  const { countProgress, religionRevealed } = usePeopleCultureMetricsAnimation(
    demographics ? metricsAnimationKey : "",
  );
  const populationNumeric = useMemo(
    () => (demographics ? parseCompactDemographicNumber(demographics.population) : null),
    [demographics],
  );
  let sectionIndex = 0;

  if (!data) {
    return (
      <div className="wtr-people-culture">
        {socialDisclosures.length > 0 ? (
          <div
            className="wtr-people-culture__social-disclosures"
            {...staggerSectionProps(
              sectionIndex++,
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
        {englishLevel ? (
          <EnglishProficiencySection
            level={englishLevel}
            staggerIndex={sectionIndex++}
            staggerClassName={staggerClassName}
            staggerStyle={staggerStyle}
          />
        ) : null}
        <div {...staggerSectionProps(sectionIndex++, undefined, staggerClassName, staggerStyle)}>
          <DemographicsDataEmptyCard
            city={city}
            country={country}
            showCountryFallback={false}
            onShowCountryFallback={() => {}}
          />
        </div>
        <div {...staggerSectionProps(sectionIndex++, undefined, staggerClassName, staggerStyle)}>
          <ReligionDataEmptyCard city={city} />
        </div>
      </div>
    );
  }

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
          <PeopleCultureSectionHeader
            id="wtr-people-culture-demo-heading"
            title="Demographics"
            country={country}
          />
          <div className="wtr-people-culture__demo-overview">
            <div className="wtr-people-culture__demo-stats">
              <div className="wtr-people-culture__demo-stat wtr-people-culture__demo-stat--start">
                <span className="wtr-people-culture__demo-stat-label">Population</span>
                <span className="wtr-people-culture__demo-stat-value">
                  {populationNumeric != null
                    ? formatCompactDemographicNumber(
                        scaledMetricValue(populationNumeric, countProgress),
                        demographics.population,
                      )
                    : demographics.population}
                </span>
              </div>
              <div className="wtr-people-culture__demo-stat wtr-people-culture__demo-stat--center">
                <span className="wtr-people-culture__demo-stat-label">Urban</span>
                <span className="wtr-people-culture__demo-stat-value tabular-nums">
                  {Math.floor(scaledMetricValue(demographics.urban_pct, countProgress))}%
                </span>
              </div>
              <div className="wtr-people-culture__demo-stat wtr-people-culture__demo-stat--end">
                <span className="wtr-people-culture__demo-stat-label">Median Age</span>
                <span className="wtr-people-culture__demo-stat-value tabular-nums">
                  {Math.floor(scaledMetricValue(demographics.median_age, countProgress))}
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
          <PeopleCultureSectionHeader
            id="wtr-people-culture-religion-heading"
            title="Religion"
            country={country}
          />
          <ReligionBreakdown breakdown={religion.breakdown} revealed={religionRevealed} />
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
          <PanelHeadsUpCallout className="wtr-people-culture__expat-heads-up">
            {panelHeadsUp}
          </PanelHeadsUpCallout>
          <div className="wtr-people-culture__expat-block">
            <p className="wtr-people-culture__expat-label">Community size</p>
            <p className="wtr-people-culture__expat-copy">
              {demographics.expat_population}
            </p>
          </div>
          <NarrativeWhyLine className="wtr-people-culture__why">
            {demographics.expat_population_why}
          </NarrativeWhyLine>
        </section>
      ) : null}
    </div>
  );
}
