import type {
  ComputedSnapshot,
  PositionReturnModel,
} from "../lib/computeResults";
import { GlobalGrowthRateSlider } from "./GlobalGrowthRateSlider";
import "./StripHeader.scss";

type C = ComputedSnapshot;

type Props = {
  phase: "growth" | "income";
  c: C;
  incomeMode: boolean;
  onIncomeMode: (incomeMode: boolean) => void;
  mergedRetirementPositionModels: PositionReturnModel[];
  mergedBrokeragePositionModels: PositionReturnModel[];
  brkRate: number;
  onOpenPositionReturnEditor: (positionId: string) => void;
  onRemovePositionReturn: (positionIds: string[]) => void;
  retRate: number;
  onRetRate: (r: number) => void;
  incYield: number;
  onIncYield: (y: number) => void;
  incGrowth: number;
  onIncGrowth: (g: number) => void;
  brkBal: number;
  wdRate: number;
  onWdRate: (r: number) => void;
  wdInflation: number;
  onWdInflation: (x: number) => void;
  currentAge: number;
  targetRetirementAge: number;
  incomeSecurityTicker: string | null;
  onIncomeSecuritySelect: (ticker: string | null) => void;
  /** Global growth slider lives in the growth assumptions column instead of the strip. */
  hideGrowthSlider?: boolean;
};

export function StripHeader({
  phase,
  c,
  incomeMode: _incomeMode,
  onIncomeMode: _onIncomeMode,
  mergedRetirementPositionModels,
  mergedBrokeragePositionModels,
  brkRate,
  onOpenPositionReturnEditor,
  onRemovePositionReturn,
  retRate,
  onRetRate,
  incYield: _incYield,
  onIncYield: _onIncYield,
  incGrowth: _incGrowth,
  onIncGrowth: _onIncGrowth,
  brkBal: _brkBal,
  wdRate: _wdRate,
  onWdRate: _onWdRate,
  wdInflation: _wdInflation,
  onWdInflation: _onWdInflation,
  currentAge: _currentAge,
  targetRetirementAge,
  incomeSecurityTicker: _incomeSecurityTicker,
  onIncomeSecuritySelect: _onIncomeSecuritySelect,
  hideGrowthSlider = false,
}: Props) {
  const showEquation = c.hasPortfolioBalances && !hideGrowthSlider;

  if (!showEquation || phase !== "growth") {
    return null;
  }

  return (
    <div
      className={`results-strip${c.hasPortfolioBalances ? " results-strip--has-portfolio" : " results-strip--empty"}`}
    >
      <div className="results-strip-inner results-strip-inner--equation-first">
        <div
          className={`strip-equation-row strip-equation-row--phase-${phase}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            marginTop: 2,
            paddingTop: 6,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="strip-growth-rail">
            <div className="strip-growth-main">
              <GlobalGrowthRateSlider
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
