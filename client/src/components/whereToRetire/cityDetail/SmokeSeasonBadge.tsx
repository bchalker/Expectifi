import {
  getSmokeSeasonForCity,
  type SmokeSeverity,
} from "../../../data/smokeSeasonData";
import "./SmokeSeasonBadge.scss";

type Props = {
  cityId: string;
};

const SEVERITY_LABELS: Record<SmokeSeverity, string> = {
  moderate: "Moderate",
  severe: "Severe",
  variable: "Variable",
};

const AXIS_MONTH_LABELS = ["Jan", "Mar", "Jun", "Sep", "Dec"] as const;

function monthSpanLeft(month: number): string {
  return `${((month - 1) / 12) * 100}%`;
}

function monthSpanWidth(startMonth: number, endMonth: number): string {
  return `${((endMonth - startMonth + 1) / 12) * 100}%`;
}

export function SmokeSeasonBadge({ cityId }: Props) {
  const info = getSmokeSeasonForCity(cityId);
  if (!info) return null;

  const { fullRange, peakMonths, severity, note } = info;

  return (
    <article
      className="detail-panel-card wtr-smoke-season-badge"
      aria-label="Smoke season advisory"
    >
      <div className="wtr-smoke-season-badge__header">
        <h3 className="wtr-weather-tab__section-title">
          <span>Smoke season</span>
        </h3>
        <span
          className={`wtr-smoke-season-badge__severity wtr-smoke-season-badge__severity--${severity}`}
        >
          {SEVERITY_LABELS[severity]}
        </span>
      </div>

      <div className="wtr-smoke-season-badge__timeline" aria-hidden>
        <div className="wtr-smoke-season-badge__bar">
          <div className="wtr-smoke-season-badge__bar-track" />
          <div
            className="wtr-smoke-season-badge__bar-range"
            style={{
              left: monthSpanLeft(fullRange.startMonth),
              width: monthSpanWidth(fullRange.startMonth, fullRange.endMonth),
            }}
          />
          {peakMonths.map((month) => (
            <div
              key={month}
              className="wtr-smoke-season-badge__bar-peak"
              style={{
                left: monthSpanLeft(month),
                width: `${(1 / 12) * 100}%`,
              }}
            />
          ))}
        </div>
        <div className="wtr-smoke-season-badge__months">
          {AXIS_MONTH_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>

      <p className="wtr-smoke-season-badge__note">{note}</p>
    </article>
  );
}
