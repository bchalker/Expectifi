import { useAnimatedScalar } from "../hooks/useAnimatedScalar";
import type { PositionReturnModel } from "../lib/positionReturnModel";
import { GrowthSliderLabel } from "./GrowthSliderLabel";

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
  onOpenPositionReturnEditor,
  onRemovePositionReturn,
  hideDefaultHelperText = false,
  suffixLayout = "inline",
  className,
}: GlobalGrowthRateSliderProps) {
  const retPctAnim = useAnimatedScalar(retRate * 100);

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
        onEditPosition={onOpenPositionReturnEditor}
        onRemovePositionReturn={onRemovePositionReturn}
        hideDefaultHelperText={hideDefaultHelperText}
        suffixLayout={suffixLayout}
        sliderTrack={
          <input
            type="range"
            min={3}
            max={55}
            step={0.5}
            value={retRate * 100}
            onChange={(e) => onRetRate(Number(e.target.value) / 100)}
            aria-label="Global annual return percent"
          />
        }
        sliderTicks={
          <div className="range-inline-ticks">
            <span className="range-inline-tick">3%</span>
            <span className="range-inline-tick range-inline-tick--end">55%</span>
          </div>
        }
      />
    </div>
  );
}
