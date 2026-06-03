import type { CSSProperties } from "react";
import { ScoreMeterRow } from "../ui/ScoreMeterRow";
import type { RetirementScoreBand } from "../../utils/retirementScore";
import "./RetirementScoreHeader.scss";

type Props = {
  /** Capped score for badge, main bar, and band. */
  displayScore: number;
  incomeFitScore: number;
  qolNormalized: number;
  band: RetirementScoreBand;
  bandColor: string;
  bandLabel: string;
  warnings?: string[];
  className?: string;
};

function bandPillLabel(label: string): string {
  return label.replace(/\s+fit$/i, "");
}

const PANEL_METER_VALUE_COLOR = "var(--color-text-success, var(--wtr-match-strong))";

export function RetirementScoreHeader({
  displayScore,
  incomeFitScore,
  qolNormalized,
  band,
  bandColor,
  bandLabel,
  warnings = [],
  className,
}: Props) {
  const mainScore = Math.max(0, Math.min(100, Math.round(displayScore)));
  const pillLabel = bandPillLabel(bandLabel);

  return (
    <div
      className={[
        "wtr-score-header",
        "wtr-score-header--panel",
        `wtr-score-header--${band}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--wtr-band-color": bandColor } as CSSProperties}
      aria-label={`Retirement score ${mainScore} percent, ${bandLabel}`}
    >
      <div className="wtr-score-header__panel-metrics">
        <div className="wtr-score-header__breakdown">
          <ScoreMeterRow
            label="Cost of Living"
            score={incomeFitScore}
            valueColor={PANEL_METER_VALUE_COLOR}
          />
          <ScoreMeterRow
            label="Quality of life"
            score={qolNormalized}
            valueColor={PANEL_METER_VALUE_COLOR}
          />
        </div>

        {warnings.length > 0 ? (
          <ul className="wtr-score-header__cap-warnings">
            {warnings.map((warning) => (
              <li key={warning} className="wtr-score-header__cap-warning">
                {warning}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="wtr-score-header__panel-score-card">
        <p className="wtr-score-header__panel-score">
          <span className="wtr-score-header__panel-score-value tabular-nums">
            {mainScore}
          </span>
          <span className="wtr-score-header__panel-score-pct" aria-hidden>
            %
          </span>
        </p>
        <span
          className="wtr-score-header__panel-band-pill"
          style={{ background: bandColor }}
        >
          {pillLabel}
        </span>
      </div>
    </div>
  );
}
