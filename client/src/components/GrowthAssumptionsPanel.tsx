import type { ComputedSnapshot, CalculatorInputs } from "../lib/computeResults";
import type { PositionReturnModel } from "../lib/positionReturnModel";
import { GlobalGrowthRateSlider } from "./GlobalGrowthRateSlider";
import { GrowthScenarioRangeCard } from "./GrowthScenarioRangeCard";
import "./GrowthAssumptionsPanel.scss";

type Props = {
  c: ComputedSnapshot;
  inputs: CalculatorInputs;
  retRate: number;
  onRetRate: (rate: number) => void;
  brkRate: number;
  mergedRetirementPositionModels: PositionReturnModel[];
  mergedBrokeragePositionModels: PositionReturnModel[];
  targetRetirementAge: number;
  onOpenPositionReturnEditor: (positionId: string) => void;
  onRemovePositionReturn: (positionIds: string[]) => void;
};

export function GrowthAssumptionsPanel({
  c,
  inputs,
  retRate,
  onRetRate,
  brkRate,
  mergedRetirementPositionModels,
  mergedBrokeragePositionModels,
  targetRetirementAge,
  onOpenPositionReturnEditor,
  onRemovePositionReturn,
}: Props) {
  return (
    <aside
      className="growth-assumptions-panel"
      aria-label="I expect to grow at"
    >
      <header className="growth-assumptions-panel__header">
        <h3 className="growth-assumptions-panel__title">I expect to grow at</h3>
      </header>

      <div className="growth-assumptions-panel__main">
        <GlobalGrowthRateSlider
          className="growth-assumptions-panel__slider"
          retRate={retRate}
          onRetRate={onRetRate}
          mergedRetirementPositionModels={mergedRetirementPositionModels}
          mergedBrokeragePositionModels={mergedBrokeragePositionModels}
          brkRate={brkRate}
          retirementCalendarYear={c.retirementCalendarYear}
          yearsToRetirement={c.yearsToRetirement}
          targetRetirementAge={targetRetirementAge}
          onOpenPositionReturnEditor={onOpenPositionReturnEditor}
          onRemovePositionReturn={onRemovePositionReturn}
          hideDefaultHelperText
          suffixLayout="panel"
        />

        <p className="growth-assumptions-panel__context">
          Accounts without their own scenario inherit this rate.
        </p>

        <GrowthScenarioRangeCard
          c={c}
          retRate={retRate}
          brkRate={brkRate}
          inputs={inputs}
        />
      </div>
    </aside>
  );
}
