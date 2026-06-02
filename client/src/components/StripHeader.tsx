import { useAnimatedScalar } from "../hooks/useAnimatedScalar";
import type { ComputedSnapshot, PositionReturnModel } from "../lib/computeResults";
import { GrowthSliderLabel } from "./GrowthSliderLabel";
import "./StripHeader.scss";

type C = ComputedSnapshot;

type Props = {
  phase: "growth" | "income";
  c: C;
  /** Fade in yield / growth strip after subheader monthly hero (see App portfolioControlsRevealed). */
  portfolioControlsRevealed: boolean;
  incomeMode: boolean;
  onIncomeMode: (incomeMode: boolean) => void;
  ssIncluded: boolean;
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
};

export function StripHeader({
  phase,
  c,
  portfolioControlsRevealed,
  incomeMode: _incomeMode,
  onIncomeMode: _onIncomeMode,
  ssIncluded: _ssIncluded,
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
}: Props) {
  const retPctAnim = useAnimatedScalar(retRate * 100);

  const showEquation = c.hasPortfolioBalances && portfolioControlsRevealed

  return (
    <div
      className={`results-strip${c.hasPortfolioBalances ? " results-strip--has-portfolio" : " results-strip--empty"}`}
    >
      <div className="results-strip-inner results-strip-inner--equation-first">
        {showEquation && phase === "growth" ? (
        <div
          className={`strip-equation-row strip-equation-row--phase-${phase} portfolio-controls-reveal portfolio-controls-reveal--in`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            marginTop: 2,
            paddingTop: 6,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {phase === "growth" ? (
              <div className="strip-growth-rail">
                <div className="strip-growth-main">
                  <GrowthSliderLabel
                    rate={retRate}
                    ratePctDisplay={retPctAnim}
                    positions={mergedRetirementPositionModels}
                    blendedRate={retRate}
                    brokeragePositionModels={mergedBrokeragePositionModels}
                    brkBlendedRate={brkRate}
                    retirementYear={c.retirementCalendarYear}
                    horizon={c.yearsToRetirement}
                    retirementAge={targetRetirementAge}
                    onEditPosition={onOpenPositionReturnEditor}
                    onRemovePositionReturn={onRemovePositionReturn}
                    sliderTrack={
                      <input
                        type="range"
                        min={3}
                        max={55}
                        step={0.5}
                        value={retRate * 100}
                        onChange={(e) => onRetRate(Number(e.target.value) / 100)}
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
              </div>
          ) : (
          null
          )}
        </div>
        ) : null}
      </div>
    </div>
  );
}
