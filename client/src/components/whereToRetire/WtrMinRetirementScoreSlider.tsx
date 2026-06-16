import { type CSSProperties } from "react";
import "./WtrMinRetirementScoreSlider.scss";
import "./WtrFilterPriorityCrossRef.scss";

const SLIDER_MAX = 100;

/** Visual reference marks on the track (not snap points). */
const SCORE_HASH_MARKS = [55, 70, 85] as const;

type Props = {
  value: number;
  onChange: (value: number) => void;
};

function scoreValueLabel(value: number): string {
  if (value <= 0) return "Any score";
  return `${value}+`;
}

function scoreRangeFillPct(value: number): string {
  return `${Math.max(0, Math.min(SLIDER_MAX, Math.round(value)))}%`;
}

export function WtrMinRetirementScoreSlider({ value, onChange }: Props) {
  const clamped = Math.max(0, Math.min(SLIDER_MAX, Math.round(value)));
  const rangeFillStyle = {
    "--range-fill": scoreRangeFillPct(clamped),
  } as CSSProperties;

  return (
    <div className="wtr-filter-score-slider">
      <div className="wtr-filter-score-slider__row">
        {/* <span className="wtr-filter-score-slider__label"></span> */}
        <div className="wtr-filter-score-slider__control">
          <div className="wtr-filter-score-slider__track-wrap">
            <input
              type="range"
              className="wtr-filter-score-slider__input"
              min={0}
              max={SLIDER_MAX}
              step={1}
              value={clamped}
              style={rangeFillStyle}
              aria-label="Minimum retirement score"
              aria-valuemin={0}
              aria-valuemax={SLIDER_MAX}
              aria-valuetext={scoreValueLabel(clamped)}
              onInput={(e) => {
                e.currentTarget.style.setProperty(
                  "--range-fill",
                  scoreRangeFillPct(Number(e.currentTarget.value)),
                );
              }}
              onChange={(e) => onChange(Number(e.target.value))}
            />
            <div className="wtr-filter-score-slider__hashmarks" aria-hidden>
              {SCORE_HASH_MARKS.map((mark) => (
                <span
                  key={mark}
                  className="wtr-filter-score-slider__hash"
                  style={{ left: `${mark}%` }}
                />
              ))}
            </div>
          </div>
          <div className="wtr-filter-score-slider__ticks" aria-hidden>
            <span className="wtr-filter-score-slider__tick wtr-filter-score-slider__tick--start">
              Any
            </span>
            {SCORE_HASH_MARKS.map((mark) => (
              <span
                key={mark}
                className="wtr-filter-score-slider__tick wtr-filter-score-slider__tick--mid"
                style={{ left: `${mark}%` }}
              >
                {mark}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
