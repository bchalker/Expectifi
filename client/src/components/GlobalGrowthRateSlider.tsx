import { useMemo, type CSSProperties } from "react";
import { useAnimatedScalar } from "../hooks/useAnimatedScalar";
import type { PositionReturnModel } from "../lib/positionReturnModel";
import { GrowthSliderLabel } from "./GrowthSliderLabel";

const GROWTH_RATE_SLIDER_MIN = 3;
const GROWTH_RATE_SLIDER_MAX = 55;

function growthRateRangeFillPct(value: number): string {
  const span = GROWTH_RATE_SLIDER_MAX - GROWTH_RATE_SLIDER_MIN;
  const pct = span > 0 ? ((value - GROWTH_RATE_SLIDER_MIN) / span) * 100 : 0;
  return `${pct}%`;
}

function growthRateRangeFillStyle(value: number): CSSProperties {
  return { "--range-fill": growthRateRangeFillPct(value) } as CSSProperties;
}

export type GlobalGrowthRateSliderProps = {
  retRate: number;
  onRetRate: (rate: number) => void;
  mergedRetirementPositionModels: PositionReturnModel[];
  mergedBrokeragePositionModels: PositionReturnModel[];
  brkRate: number;
  retirementCalendarYear: number;
  yearsToRetirement: number;
  targetRetirementAge: number;
  onOpenPositionReturnEditor: (positionId: string) => void;
  onRemovePositionReturn: (positionIds: string[]) => void;
  hideDefaultHelperText?: boolean;
  suffixLayout?: "inline" | "panel";
  onOpenRetirementAgeCompare?: () => void;
  className?: string;
};

export function GlobalGrowthRateSlider({
  retRate,
  onRetRate,
  mergedRetirementPositionModels,
  mergedBrokeragePositionModels,
  brkRate,
  retirementCalendarYear,
  yearsToRetirement,
  targetRetirementAge,
  onRemovePositionReturn,
  hideDefaultHelperText = false,
  suffixLayout = "inline",
  onOpenRetirementAgeCompare,
  className,
}: GlobalGrowthRateSliderProps) {
  const retPctAnim = useAnimatedScalar(retRate * 100);
  const sliderPct = retRate * 100;
  const panelRangeFillStyle = useMemo(
    () =>
      suffixLayout === "panel"
        ? growthRateRangeFillStyle(sliderPct)
        : undefined,
    [sliderPct, suffixLayout],
  );

  return (
    <div className={className}>
      <GrowthSliderLabel
        rate={retRate}
        ratePctDisplay={retPctAnim}
        positions={mergedRetirementPositionModels}
        blendedRate={retRate}
        brokeragePositionModels={mergedBrokeragePositionModels}
        brkBlendedRate={brkRate}
        retirementYear={retirementCalendarYear}
        horizon={yearsToRetirement}
        retirementAge={targetRetirementAge}
        onRemovePositionReturn={onRemovePositionReturn}
        hideDefaultHelperText={hideDefaultHelperText}
        suffixLayout={suffixLayout}
        onOpenRetirementAgeCompare={onOpenRetirementAgeCompare}
        sliderTrack={
          <input
            type="range"
            className={
              suffixLayout === "panel"
                ? "growth-slider-label__panel-range"
                : undefined
            }
            min={GROWTH_RATE_SLIDER_MIN}
            max={GROWTH_RATE_SLIDER_MAX}
            step={0.5}
            value={sliderPct}
            style={panelRangeFillStyle}
            onInput={(e) => {
              const next = Number(e.currentTarget.value);
              e.currentTarget.style.setProperty(
                "--range-fill",
                growthRateRangeFillPct(next),
              );
              onRetRate(next / 100);
            }}
            aria-label="Global annual return percent"
          />
        }
        sliderTicks={
          <div className="range-inline-ticks">
            <span className="range-inline-tick">3%</span>
            <span className="range-inline-tick range-inline-tick--end">
              55%
            </span>
          </div>
        }
      />
    </div>
  );
}
