import { useCallback, useEffect, useRef, useState } from "react";
import { useAnimatedScalar } from "../hooks/useAnimatedScalar";
import { useClickOutside } from "../hooks/useClickOutside";
import type {
  ComputedSnapshot,
  IncomeYieldPreset,
  PositionReturnModel,
} from "../lib/computeResults";
import { GrowthSliderLabel } from "./GrowthSliderLabel";
import "./StripHeader.scss";

type C = ComputedSnapshot;

/** Drift at this value (≈ mild yearly share-price erosion) shows “normal NAV erosion”. */
const STRIP_NAV_NORMAL_DRIFT = -0.02;

function isNormalNavErosionDrift(incGrowth: number): boolean {
  return Math.abs(incGrowth - STRIP_NAV_NORMAL_DRIFT) < 0.0025;
}

export type IncomePresetStripPick =
  | { kind: "preset"; id: string }
  | { kind: "manual" }
  | { kind: "add" };

type Props = {
  phase: "growth" | "income";
  c: C;
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
  incomePresets: IncomeYieldPreset[];
  activePreset: string | null;
  onIncomePresetPick: (pick: IncomePresetStripPick) => void;
};

export function StripHeader({
  phase,
  c,
  incomeMode,
  onIncomeMode,
  ssIncluded: _ssIncluded,
  mergedRetirementPositionModels,
  mergedBrokeragePositionModels,
  brkRate,
  onOpenPositionReturnEditor,
  onRemovePositionReturn,
  retRate,
  onRetRate,
  incYield,
  onIncYield,
  incGrowth,
  onIncGrowth,
  brkBal: _brkBal,
  wdRate,
  onWdRate,
  wdInflation,
  onWdInflation,
  currentAge: _currentAge,
  targetRetirementAge,
  incomePresets,
  activePreset,
  onIncomePresetPick,
}: Props) {
  const presetSelectValue =
    activePreset != null && incomePresets.some((p) => p.id === activePreset)
      ? activePreset
      : "__manual__";

  const retPctAnim = useAnimatedScalar(retRate * 100);
  const incYieldPctAnim = useAnimatedScalar(incYield * 100);
  const incGrowthPctAnim = useAnimatedScalar(incGrowth * 100);
  const wdPctAnim = useAnimatedScalar(wdRate * 100);
  const wdInflPctAnim = useAnimatedScalar(wdInflation * 100);

  const [navPopoverOpen, setNavPopoverOpen] = useState(false);
  const navPopoverRef = useRef<HTMLDivElement>(null);
  const navErosionTriggerRef = useRef<HTMLButtonElement>(null);

  const [inflPopoverOpen, setInflPopoverOpen] = useState(false);
  const inflPopoverRef = useRef<HTMLDivElement>(null);
  const inflTriggerRef = useRef<HTMLButtonElement>(null);

  const closeNavPopover = useCallback(() => setNavPopoverOpen(false), []);
  const closeInflPopover = useCallback(() => setInflPopoverOpen(false), []);
  useClickOutside(navPopoverRef, closeNavPopover, navPopoverOpen, [
    navErosionTriggerRef,
  ]);
  useClickOutside(inflPopoverRef, closeInflPopover, inflPopoverOpen, [
    inflTriggerRef,
  ]);

  useEffect(() => {
    if (phase !== "income" || !incomeMode) setNavPopoverOpen(false);
    if (phase !== "income" || incomeMode) setInflPopoverOpen(false);
  }, [phase, incomeMode]);

  return (
    <div className="results-strip">
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
                slider={
                  <div className="range-inline-row">
                    <input
                      type="range"
                      min={3}
                      max={55}
                      step={0.5}
                      value={retRate * 100}
                      onChange={(e) => onRetRate(Number(e.target.value) / 100)}
                    />
                    <div className="range-inline-ticks">
                      <span className="range-inline-tick">3%</span>
                      <span className="range-inline-tick range-inline-tick--end">
                        55%
                      </span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
          ) : (
          <div className="strip-income-rail">
            <div className="strip-income-main">
              {incomeMode ? (
                <>
                  <div className="strip-income-metric-stack">
                    <span className="strip-income-metric-stack__pct strip-equation-main-val--accent strip-equation-main-val--tween">
                      {incYieldPctAnim.toFixed(2)}%
                    </span>
                    <span className="strip-income-metric-stack__caption">
                      Yield
                    </span>
                  </div>
                  <div className="range-inline-row">
                    <input
                      type="range"
                      min={2}
                      max={20}
                      step={0.25}
                      value={incYield * 100}
                      onChange={(e) =>
                        onIncYield(Number(e.target.value) / 100)
                      }
                    />
                    <div className="range-inline-ticks">
                      <span className="range-inline-tick">2%</span>
                      <span className="range-inline-tick range-inline-tick--end">
                        20%
                      </span>
                    </div>
                  </div>
                  <div className="strip-income-controls-row">
                    <select
                      className="strip-select-underline strip-select-underline--mode"
                      value={incomeMode ? "dividend" : "withdraw"}
                      onChange={(e) =>
                        onIncomeMode(e.target.value === "dividend")
                      }
                      aria-label="Income mode: dividend yield or withdrawal rate"
                    >
                      <option value="dividend">Dividend</option>
                      <option value="withdraw">Withdraw</option>
                    </select>
                    <select
                      className="strip-select-underline strip-select-underline--preset"
                      value={presetSelectValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__add_new__") {
                          onIncomePresetPick({ kind: "add" });
                          return;
                        }
                        if (v === "__manual__") {
                          onIncomePresetPick({ kind: "manual" });
                          return;
                        }
                        onIncomePresetPick({ kind: "preset", id: v });
                      }}
                      aria-label="Dividend yield preset"
                    >
                      <option value="__manual__">Custom</option>
                      {incomePresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                      <option value="__add_new__">Add new…</option>
                    </select>
                    <span className="strip-income-nav-erosion-wrap">
                      <span className="strip-income-nav-erosion-secondary">
                        <span className="strip-income-nav-erosion-secondary__lead">
                          with{' '}
                        </span>
                        <button
                          ref={navErosionTriggerRef}
                          type="button"
                          className="strip-income-pct-pill"
                          aria-expanded={navPopoverOpen}
                          aria-haspopup="dialog"
                          aria-controls="strip-income-nav-popover"
                          id="strip-income-nav-erosion-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNavPopoverOpen((o) => {
                              const next = !o;
                              if (next) setInflPopoverOpen(false);
                              return next;
                            });
                          }}
                        >
                          {isNormalNavErosionDrift(incGrowth) ? (
                            'normal'
                          ) : (
                            <>
                              {incGrowthPctAnim >= 0 ? '+' : ''}
                              {incGrowthPctAnim.toFixed(1)}%
                            </>
                          )}
                        </button>
                        <span className="strip-income-nav-erosion-secondary__trail">
                          {' '}
                          NAV erosion
                        </span>
                      </span>
                      {navPopoverOpen ? (
                        <div
                          ref={navPopoverRef}
                          id="strip-income-nav-popover"
                          className="strip-income-nav-popover"
                          role="dialog"
                          aria-labelledby="strip-income-nav-popover-title"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            id="strip-income-nav-popover-title"
                            className="strip-income-nav-popover__title"
                          >
                            NAV drift / year
                          </div>
                          <div className="strip-income-nav-popover__value-row">
                            <span className="strip-equation-main-val strip-equation-main-val--accent strip-equation-main-val--tween">
                              {incGrowthPctAnim >= 0 ? "+" : ""}
                              {incGrowthPctAnim.toFixed(1)}%
                            </span>
                          </div>
                          <div className="range-inline-row strip-income-nav-popover__slider">
                            <input
                              type="range"
                              min={-10}
                              max={10}
                              step={0.5}
                              value={incGrowth * 100}
                              onChange={(e) =>
                                onIncGrowth(Number(e.target.value) / 100)
                              }
                              aria-valuemin={-10}
                              aria-valuemax={10}
                              aria-valuenow={incGrowth * 100}
                              aria-label="Net NAV drift per year"
                            />
                            <div className="range-inline-ticks">
                              <span className="range-inline-tick strip-income-nav-tick--neg">
                                −10%
                              </span>
                              <span className="range-inline-tick range-inline-tick--end strip-income-nav-tick--pos">
                                +10%
                              </span>
                            </div>
                          </div>
                          <div className="strip-income-nav-popover__explain">
                            <h3 className="strip-income-nav-popover__subtitle">
                              What is NAV erosion?
                            </h3>
                            <p className="strip-income-nav-popover__body">
                              Some high-yield funds pay distributions that are not fully covered by
                              underlying investment income alone. Part of the cash flow can come
                              from mechanics that tend to pull down the fund&apos;s{' '}
                              <strong>net asset value (NAV)</strong>—the price per share—even when
                              the dividend looks steady. In this model, a{' '}
                              <strong>negative</strong> yearly drift is &quot;NAV erosion&quot;: the
                              share price is expected to slide by about that percentage each year
                              from that effect, before other market forces. A{' '}
                              <strong>positive</strong> drift means you expect price appreciation
                              alongside yield.
                            </p>
                            <p className="strip-income-nav-popover__body strip-income-nav-popover__body--example">
                              <span className="strip-income-nav-popover__example-label">
                                Example:
                              </span>{' '}
                              You buy a fund at <strong>$50</strong> per share. If you set{' '}
                              <strong>−4% NAV drift per year</strong>, you are saying that—holding
                              everything else equal—the share price might trend toward roughly{' '}
                              <strong>$48</strong> after a year from erosion alone, even if you
                              reinvest distributions, unless other drivers push the price the other
                              way. The calculator combines that drift with your yield assumption to
                              stress-test retirement income.
                            </p>
                          </div>
                          <p className="strip-income-nav-popover__hint">
                            Use the slider for net drift per year. Negative = erosion; positive =
                            expected price appreciation with yield.
                          </p>
                        </div>
                      ) : null}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="strip-income-metric-stack">
                    <span className="strip-income-metric-stack__pct strip-equation-main-val--accent strip-equation-main-val--tween">
                      {wdPctAnim.toFixed(1)}%
                    </span>
                    <span className="strip-income-metric-stack__caption">
                      Withdrawal rate on portfolio
                    </span>
                  </div>
                  <div className="range-inline-row">
                    <input
                      type="range"
                      min={3}
                      max={7}
                      step={0.1}
                      value={wdRate * 100}
                      onChange={(e) => onWdRate(Number(e.target.value) / 100)}
                    />
                    <div className="range-inline-ticks">
                      <span className="range-inline-tick">3%</span>
                      <span className="range-inline-tick range-inline-tick--end">
                        7%
                      </span>
                    </div>
                  </div>
                  <div className="strip-income-controls-row">
                    <select
                      className="strip-select-underline strip-select-underline--mode"
                      value={incomeMode ? "dividend" : "withdraw"}
                      onChange={(e) =>
                        onIncomeMode(e.target.value === "dividend")
                      }
                      aria-label="Income mode: dividend yield or withdrawal rate"
                    >
                      <option value="dividend">Dividend</option>
                      <option value="withdraw">Withdraw</option>
                    </select>
                    <span className="strip-income-inflation-wrap">
                      <span className="strip-income-inflation-secondary">
                        <span className="strip-income-inflation-secondary__lead">
                          with{' '}
                        </span>
                        <button
                          ref={inflTriggerRef}
                          type="button"
                          className="strip-income-pct-pill"
                          aria-expanded={inflPopoverOpen}
                          aria-haspopup="dialog"
                          aria-controls="strip-income-inflation-popover"
                          id="strip-income-inflation-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInflPopoverOpen((o) => {
                              const next = !o;
                              if (next) setNavPopoverOpen(false);
                              return next;
                            });
                          }}
                        >
                          {wdInflPctAnim.toFixed(1)}%
                        </button>
                        <span className="strip-income-inflation-secondary__trail">
                          {' '}
                          inflation adjustment
                        </span>
                      </span>
                      {inflPopoverOpen ? (
                        <div
                          ref={inflPopoverRef}
                          id="strip-income-inflation-popover"
                          className="strip-income-nav-popover"
                          role="dialog"
                          aria-labelledby="strip-income-inflation-popover-title"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            id="strip-income-inflation-popover-title"
                            className="strip-income-nav-popover__title"
                          >
                            Inflation adjustment
                          </div>
                          <div className="strip-income-nav-popover__value-row">
                            <span className="strip-equation-main-val strip-equation-main-val--accent strip-equation-main-val--tween">
                              +{wdInflPctAnim.toFixed(2)}%
                            </span>
                          </div>
                          <div className="range-inline-row strip-income-nav-popover__slider">
                            <input
                              type="range"
                              min={0}
                              max={6}
                              step={0.25}
                              value={wdInflation * 100}
                              onChange={(e) =>
                                onWdInflation(Number(e.target.value) / 100)
                              }
                              aria-valuemin={0}
                              aria-valuemax={6}
                              aria-valuenow={wdInflation * 100}
                              aria-label="Annual inflation uplift on withdrawal rate"
                            />
                            <div className="range-inline-ticks">
                              <span className="range-inline-tick">0%</span>
                              <span className="range-inline-tick range-inline-tick--end">
                                6%
                              </span>
                            </div>
                          </div>
                          <div className="strip-income-nav-popover__explain">
                            <p className="strip-income-nav-popover__body">
                              Multiplier on top of the base withdrawal rate: annual
                              withdrawal is modeled as portfolio × withdrawal rate ×{' '}
                              <strong>(1 + this adjustment)</strong>. Use it to stress-test
                              a higher draw than the headline percentage alone.
                            </p>
                          </div>
                          <p className="strip-income-nav-popover__hint">
                            Slide to set the extra uplift (0–6%) applied together with the
                            withdrawal percentage above.
                          </p>
                        </div>
                      ) : null}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
