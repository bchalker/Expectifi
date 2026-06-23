import { useMemo, type CSSProperties } from "react";
import { IconShieldHeart, IconStethoscope } from "@tabler/icons-react";
import { DataConfidenceNote } from "../ui/DataConfidenceNote";
import { formatHealthcareInsuranceMonthlyRange } from "../../utils/countryPreferenceData";
import {
  formatQoLDisplayScore,
  getQualityOfLifeData,
  getQoLTabSourceFooter,
  healthcareBandDescription,
  QOL_NORMALIZED_MAX,
  QOL_UNAVAILABLE_MESSAGE,
  qolNormalizedFromIndex,
  qolOverallBandToVisual,
  qolOverallScoreBand,
  resolveQoLMetricBand,
  type QoLMetricKey,
  type QualityOfLifeCountryData,
} from "../../utils/qualityOfLife";
import { QoLBandedScoreMeter } from "./QoLBandedScoreMeter";
import "./DestinationQualityOfLifeTab.scss";

type Props = {
  country: string;
  staggerClassName?: string;
  staggerStyle?: (index: number) => CSSProperties;
};

type MetricRowConfig = {
  id: QoLMetricKey;
  label: string;
  score: number;
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

function QoLHealthcareCard({
  country,
  data,
  style,
}: {
  country: string;
  data: QualityOfLifeCountryData;
  style?: CSSProperties;
}) {
  const score = data.healthcare_index;
  const description = healthcareBandDescription(score);
  const insuranceRange = formatHealthcareInsuranceMonthlyRange(country);

  return (
    <article
      className="wtr-qol-healthcare"
      aria-labelledby="wtr-qol-healthcare-heading"
      style={style}
    >
      <div className="wtr-qol-healthcare__body">
        <div
          id="wtr-qol-healthcare-heading"
          className="wtr-qol-healthcare__header"
        >
          <span className="wtr-qol-healthcare__header-icon" aria-hidden>
            <IconStethoscope size={16} strokeWidth={1.5} />
          </span>
          <span className="wtr-qol-healthcare__header-label">
            Healthcare quality
          </span>
        </div>

        <QoLBandedScoreMeter
          metricKey="healthcare"
          score={score}
          description={description}
        />
      </div>

      <div className="wtr-qol-healthcare__divider" role="presentation" />

      <div className="wtr-qol-healthcare__insurance">
        <div className="wtr-qol-healthcare__insurance-copy">
          <div className="wtr-qol-healthcare__insurance-label">
            <span className="wtr-qol-healthcare__insurance-icon" aria-hidden>
              <IconShieldHeart size={16} strokeWidth={1.5} />
            </span>
            <span>Insurance cost</span>
          </div>
          <DataConfidenceNote variant="heuristic" />
        </div>
        <p className="wtr-qol-healthcare__insurance-value tabular-nums">
          {insuranceRange}
          <span className="wtr-qol-healthcare__insurance-suffix">/mo est.</span>
        </p>
      </div>
    </article>
  );
}

function QoLOverallCard({
  data,
  className,
  style,
}: {
  data: QualityOfLifeCountryData;
  className?: string;
  style?: CSSProperties;
}) {
  const qolNormalized = qolNormalizedFromIndex(data.quality_of_life_index);
  const { band, label: bandLabel } = qolOverallScoreBand(
    data.quality_of_life_index,
  );
  const scoreValue = formatQoLDisplayScore(qolNormalized);
  const { label: meterBandLabel } = resolveQoLMetricBand(
    "overall",
    qolNormalized,
  );

  return (
    <div
      className={["wtr-qol-overall", `wtr-qol-overall--${band}`, className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <h3
        id="wtr-qol-overall-heading"
        className="wtr-city-detail__section-title wtr-qol-overall__label"
      >
        Overall quality of life score
      </h3>
      <div className="wtr-qol-overall__score-row">
        <p className="wtr-qol-overall__score tabular-nums">
          <span className="wtr-qol-overall__score-value">{scoreValue}</span>
          <span className="wtr-qol-overall__score-denom">
            {" "}
            / {QOL_NORMALIZED_MAX}
          </span>
        </p>
        <span
          className={`wtr-qol-overall__badge wtr-qol-overall__badge--${band}`}
        >
          {bandLabel}
        </span>
      </div>
      <QoLBandedScoreMeter
        metricKey="overall"
        score={qolNormalized}
        visualBand={qolOverallBandToVisual(band)}
        compact
        meterAriaLabel={`Overall quality of life: ${meterBandLabel}, score ${scoreValue} out of ${QOL_NORMALIZED_MAX}`}
      />
    </div>
  );
}

function QoLMetricRow({ config }: { config: MetricRowConfig }) {
  const scoreValue = formatQoLDisplayScore(config.score);
  const { label: bandLabel, visualClass } = resolveQoLMetricBand(
    config.id,
    config.score,
  );

  return (
    <li
      className={[
        "wtr-qol-metric-row",
        `wtr-qol-metric-row--${visualClass}`,
      ].join(" ")}
    >
      <span className="wtr-qol-metric-row__label">{config.label}</span>
      <span className="wtr-qol-metric-row__value tabular-nums">
        {scoreValue}
      </span>
      <span
        className={`wtr-qol-metric-row__band wtr-qol-metric-row__band--${visualClass}`}
      >
        {bandLabel}
      </span>
    </li>
  );
}

function buildMetricRows(data: QualityOfLifeCountryData): MetricRowConfig[] {
  return [
    { id: "safety", label: "Safety", score: data.safety_index },
    { id: "climate", label: "Climate", score: data.climate_index },
    { id: "pollution", label: "Air quality", score: data.pollution_index },
    {
      id: "purchasing",
      label: "Purchasing",
      score: data.purchasing_power_index,
    },
    { id: "traffic", label: "Traffic", score: data.traffic_commute_index },
  ];
}

export function DestinationQualityOfLifeTab({
  country,
  staggerClassName,
  staggerStyle,
}: Props) {
  const data = useMemo(() => getQualityOfLifeData(country), [country]);
  const sourceFooter = useMemo(
    () => (data ? getQoLTabSourceFooter(data.source) : ""),
    [data],
  );

  if (!data) {
    return (
      <p
        {...staggerSectionProps(
          0,
          "wtr-qol-tab__empty",
          staggerClassName,
          staggerStyle,
        )}
      >
        {QOL_UNAVAILABLE_MESSAGE}
      </p>
    );
  }

  const metrics = buildMetricRows(data);

  return (
    <div className="wtr-qol-tab">
      <section
        className="detail-panel-card wtr-qol-tab__row wtr-qol-tab__row--score"
        {...staggerSectionProps(0, undefined, staggerClassName, staggerStyle)}
      >
        <article
          className="wtr-qol-score-card"
          aria-labelledby="wtr-qol-overall-heading"
        >
          <QoLOverallCard data={data} />
          <ul className="wtr-qol-metrics">
            {metrics.map((row) => (
              <QoLMetricRow key={row.id} config={row} />
            ))}
          </ul>
        </article>
      </section>

      <section
        className="detail-panel-card wtr-qol-tab__row wtr-qol-tab__row--healthcare"
        {...staggerSectionProps(1, undefined, staggerClassName, staggerStyle)}
      >
        <QoLHealthcareCard country={country} data={data} />
      </section>

      <section
        className="wtr-qol-tab__row wtr-qol-tab__row--source"
        {...staggerSectionProps(2, undefined, staggerClassName, staggerStyle)}
      >
        <p className="wtr-qol-tab__footnote">{sourceFooter}</p>
      </section>
    </div>
  );
}
