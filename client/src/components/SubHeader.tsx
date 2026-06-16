import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useAnimatedScalar,
} from "../hooks/useAnimatedScalar";
import {
  marketScenarioHeroBadgeLabel,
  marketScenarioIsBase,
  type MarketScenarioId,
} from "../lib/marketScenario";
import { fmt } from "../utils/format";
import type { GuaranteedIncomeTooltipModel } from "../lib/guaranteedIncome";
import { PhaseSegmentTabs, type PhaseSegment } from "./PhaseSegmentTabs";
import { Tooltip } from "./Tooltip";
import "./SubHeader.scss";
import "./Tooltip.scss";

type Phase = PhaseSegment;

function subheaderMarketScenarioPillClass(id: MarketScenarioId): string {
  if (id === "bull") return "subheader-market-scenario-pill--bull";
  if (id === "bear" || id === "recession_recovery") {
    return "subheader-market-scenario-pill--bear";
  }
  if (id === "stagflation") return "subheader-market-scenario-pill--stagflation";
  if (id === "lost_decade") return "subheader-market-scenario-pill--lost_decade";
  return "";
}

type Props = {
  phase: Phase;
  onPhase: (p: Phase) => void;
  grossMon: number;
  totalFV: number;
  targetRetirementAge: number;
  /** When false, show Add guaranteed income until sources are saved. */
  guaranteedIncomeConfigured: boolean;
  onOpenGuaranteedIncomeConfig: () => void;
  guaranteedIncomeTooltip?: GuaranteedIncomeTooltipModel;
  /** When false, header shows $0 — no manual balances or imported positions to project from. */
  hasPortfolioBalances: boolean;
  marketScenarioId?: MarketScenarioId;
  /** When false, hide scenario pill and hero uses Base projections. */
  marketScenarioActive?: boolean;
  /** Global slider rate — used to derive scenario modifier for the hero pill. */
  marketScenarioRetRate?: number;
  yearsToRetirement?: number;
  className?: string;
  /** When false, hero numbers snap to target (boot hydrate) instead of counting up. */
  valuesReady?: boolean;
  /** Suffix for tab/panel ids when rendering a second instance (e.g. in .main). */
  instanceId?: string;
};

/** Back wave (1000×100); fill uses theme token via inline SVG */
const SUBHEADER_WAVE_BACK_D = "M0 0v100S0 4 500 4s500 96 500 96V0H0Z";
/** Front divider (1000×72) — fill from CSS (.subheader-bubble__front-path) */
const SUBHEADER_WAVE_FRONT_D = "M0 0v3c350 0 350 69 500 69S650 3 1000 3V0H0Z";

export function SubHeader({
  phase,
  onPhase,
  grossMon,
  totalFV,
  targetRetirementAge,
  guaranteedIncomeConfigured,
  onOpenGuaranteedIncomeConfig,
  guaranteedIncomeTooltip,
  hasPortfolioBalances,
  marketScenarioId = "base",
  marketScenarioActive = false,
  marketScenarioRetRate = 0,
  yearsToRetirement = 1,
  className,
  valuesReady = true,
  instanceId,
}: Props) {
  const mountedPhaseRef = useRef<Phase | null>(null);
  const [phaseEntryGen, setPhaseEntryGen] = useState(0);

  useEffect(() => {
    if (mountedPhaseRef.current !== null && mountedPhaseRef.current !== phase) {
      setPhaseEntryGen((gen) => gen + 1);
    }
    mountedPhaseRef.current = phase;
  }, [phase]);

  const animatePhaseEntry = phaseEntryGen > 0;
  const grossAnim = useAnimatedScalar(grossMon, 420, { animate: valuesReady });
  const totalFvAnim = useAnimatedScalar(totalFV, 420, { animate: valuesReady });

  const incomePhase = phase === "income";
  const showGuaranteedIncomeRetirementNote =
    (guaranteedIncomeTooltip?.rows.some(
      (row) => row.startAge > targetRetirementAge,
    ) ??
      false) &&
    (guaranteedIncomeTooltip?.rows.length ?? 0) > 0;
  const showMarketScenarioPill =
    !incomePhase &&
    hasPortfolioBalances &&
    !marketScenarioIsBase(marketScenarioId) &&
    marketScenarioActive;
  const marketScenarioLabel = showMarketScenarioPill
    ? marketScenarioHeroBadgeLabel(
        marketScenarioId,
        marketScenarioRetRate,
        yearsToRetirement,
      )
    : "";
  const marketScenarioPillClass = showMarketScenarioPill
    ? subheaderMarketScenarioPillClass(marketScenarioId)
    : "";


  return (
    <header
      className={[
        "subheader",
        incomePhase ? "subheader--phase-income" : "",
        !hasPortfolioBalances ? "subheader--no-balances" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="subheader-waves">
        <div className="subheader-waves__bubbles" aria-hidden>
          <svg
            className="subheader-bubble subheader-bubble--back"
            viewBox="0 0 1000 100"
            preserveAspectRatio="xMidYMax slice"
          >
            <path d={SUBHEADER_WAVE_BACK_D} />
          </svg>
          <div className="subheader-waves__front-scale">
            <svg
              className="subheader-bubble subheader-bubble--front"
              viewBox="0 0 1000 72"
              preserveAspectRatio="xMidYMax slice"
            >
              <path
                className="subheader-bubble__front-path"
                d={SUBHEADER_WAVE_FRONT_D}
              />
            </svg>
          </div>
        </div>
      </div>
      {hasPortfolioBalances ? (
        <div className="subheader-content">
          <div className="subheader-estimate" aria-live="polite">
            <div className="subheader-estimate__top">
              <PhaseSegmentTabs
                phase={phase}
                onPhase={onPhase}
                targetRetirementAge={targetRetirementAge}
                instanceId={instanceId}
                incomePhase={incomePhase}
              />
            </div>

            <div className="subheader-estimate__center">
              <div
                key={animatePhaseEntry ? `${phase}-${phaseEntryGen}` : "initial"}
                className="subheader-estimate__swap"
              >
                <div
                  className={[
                    "subheader-estimate__value",
                    animatePhaseEntry && "subheader-estimate__value--enter",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="subheader-estimate__value-num">
                    {incomePhase ? fmt(grossAnim) : fmt(totalFvAnim)}
                  </span>
                  {incomePhase ? (
                    <span className="subheader-estimate__value-suffix">/mo</span>
                  ) : null}
                </div>
                {showMarketScenarioPill ? (
                  <span
                    className={[
                      "font-xs",
                      "subheader-market-scenario-pill",
                      animatePhaseEntry && "subheader-estimate__note--enter",
                      marketScenarioPillClass,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="subheader-market-scenario-pill__dot" aria-hidden />
                    {marketScenarioLabel}
                  </span>
                ) : null}
                {incomePhase ? (
                  <div className="subheader-estimate__meta">
                    <div
                      className="subheader-estimate__note subheader-estimate__note--ss-row subheader-estimate__note--guaranteed-income"
                      role="group"
                      aria-label="Guaranteed income in expected monthly income"
                    >
                      {guaranteedIncomeConfigured ? (
                        <div className="subheader-guaranteed-income-toggle">
                          <span className="font-xs subheader-ss-toggle__text subheader-guaranteed-income-toggle__label">
                            Includes{" "}
                            <Tooltip
                              nativeTrigger
                              placement="top"
                              showArrow
                              delay={250}
                              closeDelay={80}
                              contentClassName="subheader-guaranteed-income-tooltip__content"
                              content={
                                <div className="subheader-guaranteed-income-tooltip">
                                  {guaranteedIncomeTooltip?.rows.length ? (
                                    <>
                                      <ul className="subheader-guaranteed-income-tooltip__list">
                                        {guaranteedIncomeTooltip.rows.map((row) => (
                                          <li
                                            key={row.id}
                                            className="subheader-guaranteed-income-tooltip__row"
                                          >
                                            <span className="subheader-guaranteed-income-tooltip__name">
                                              {row.label}
                                            </span>
                                            <span className="subheader-guaranteed-income-tooltip__detail">
                                              <span className="subheader-guaranteed-income-tooltip__amount">
                                                +{fmt(row.monthlyAmount)}/mo
                                              </span>
                                              <span className="subheader-guaranteed-income-tooltip__age">
                                                at {row.startAge}
                                              </span>
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                      {showGuaranteedIncomeRetirementNote ? (
                                        <p className="subheader-guaranteed-income-tooltip__context font-xs">
                                          You retire at {targetRetirementAge} — these
                                          kick in a few years later.
                                        </p>
                                      ) : null}
                                    </>
                                  ) : (
                                    <p className="subheader-guaranteed-income-tooltip__empty">
                                      No guaranteed income configured yet.
                                    </p>
                                  )}
                                </div>
                              }
                            >
                              <button
                                type="button"
                                className="subheader-guaranteed-income-toggle__link"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onOpenGuaranteedIncomeConfig();
                                }}
                              >
                                guaranteed income
                              </button>
                            </Tooltip>
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="font-xs subheader-ss-add-btn"
                          onClick={onOpenGuaranteedIncomeConfig}
                        >
                          Add guaranteed income
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
