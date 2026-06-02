import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { IconChevronRight } from "@tabler/icons-react";
import { useAnimatedScalar } from "../hooks/useAnimatedScalar";
import {
  getMarketScenarioDefinition,
  marketScenarioIsBase,
  type MarketScenarioId,
} from "../lib/marketScenario";
import { SS_CLAIM_AGE_OPTIONS, clampClaimAge } from "../lib/socialSecurity";
import { fmt } from "../utils/format";
import "./SubHeader.scss";

type Phase = "growth" | "income";

type ThumbRect = { left: number; width: number };

/** Growth / Income pill toggle — single sliding thumb (HeroUI Tabs.Indicator mis-animates here). */
function PhaseSegmentTabs({
  phase,
  onPhase,
  targetRetirementAge,
}: {
  phase: Phase;
  onPhase: (p: Phase) => void;
  targetRetirementAge: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const growthRef = useRef<HTMLButtonElement>(null);
  const incomeRef = useRef<HTMLButtonElement>(null);
  const [thumb, setThumb] = useState<ThumbRect>({ left: 0, width: 0 });

  const measureThumb = useCallback(() => {
    const track = trackRef.current;
    const tab = phase === "growth" ? growthRef.current : incomeRef.current;
    if (!track || !tab) return;
    const trackRect = track.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    setThumb({ left: tabRect.left - trackRect.left, width: tabRect.width });
  }, [phase]);

  useLayoutEffect(() => {
    measureThumb();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureThumb());
    ro.observe(track);
    return () => ro.disconnect();
  }, [measureThumb]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    onPhase(phase === "growth" ? "income" : "growth");
  };

  return (
    <div
      ref={trackRef}
      className="subheader-phase-segment"
      role="tablist"
      aria-label="Show portfolio growth total or retirement income"
      onKeyDown={onKeyDown}
    >
      <div
        className="subheader-phase-segment__thumb"
        aria-hidden
        style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }}
      />
      <button
        ref={growthRef}
        type="button"
        role="tab"
        id="subheader-phase-growth"
        aria-selected={phase === "growth"}
        aria-controls="subheader-phase-growth-panel"
        tabIndex={phase === "growth" ? 0 : -1}
        className="subheader-phase-segment__tab"
        onClick={() => onPhase("growth")}
      >
        Growth
      </button>
      <button
        ref={incomeRef}
        type="button"
        role="tab"
        id="subheader-phase-income"
        aria-selected={phase === "income"}
        aria-controls="subheader-phase-income-panel"
        tabIndex={phase === "income" ? 0 : -1}
        className="subheader-phase-segment__tab subheader-phase-segment__tab--income"
        onClick={() => onPhase("income")}
      >
        <span className="subheader-phase-segment__income-label">
          <span className="subheader-phase-segment__income-word">Income</span>{" "}
          <span className="subheader-phase-segment__income-at">at</span> {targetRetirementAge}
        </span>
      </button>
    </div>
  );
}

function subheaderMarketScenarioPillClass(id: MarketScenarioId): string {
  if (id === "bull") return "subheader-market-scenario-pill--bull";
  if (id === "bear" || id === "recession_recovery") {
    return "subheader-market-scenario-pill--bear";
  }
  if (id === "stagflation") return "subheader-market-scenario-pill--stagflation";
  if (id === "lost_decade") return "subheader-market-scenario-pill--lost_decade";
  return "";
}

/** Claim age — trigger opens panel with 62 / 67 / 70 button group. */
function SubheaderClaimAgePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (age: number) => void;
}) {
  const claimAge = clampClaimAge(value);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="subheader-claim-age-picker">
      <button
        type="button"
        className="subheader-claim-age-picker__trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="subheader-claim-age-panel"
        aria-label={`Social Security claiming age ${claimAge}. Change claiming age.`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="subheader-claim-age-picker__trigger-text">
          At age{" "}
          <span className="subheader-claim-age-picker__trigger-age">
            {claimAge}
          </span>
        </span>
        <IconChevronRight
          className="subheader-claim-age-picker__chevron"
          size={14}
          stroke={1.5}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id="subheader-claim-age-panel"
          className="subheader-claim-age-picker__panel"
          role="dialog"
          aria-label="Your Social Security claiming age"
        >
          <div
            className="subheader-claim-age-picker__group"
            role="group"
            aria-label="Select claiming age"
          >
            {SS_CLAIM_AGE_OPTIONS.map((age) => {
              const selected = claimAge === age;
              return (
                <button
                  key={age}
                  type="button"
                  className={[
                    "subheader-claim-age-picker__btn",
                    selected && "subheader-claim-age-picker__btn--on",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={selected}
                  onClick={() => {
                    onChange(age);
                    setOpen(false);
                  }}
                >
                  {age}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  phase: Phase;
  onPhase: (p: Phase) => void;
  grossMon: number;
  totalFV: number;
  targetRetirementAge: number;
  ssIncluded: boolean;
  onSsIncluded: (v: boolean) => void;
  ssClaimAge: number;
  onSsClaimAgeChange: (age: number) => void;
  /** When false, show Add Social Security instead of the toggle. */
  ssTimingConfigured: boolean;
  onOpenSsConfig: () => void;
  /** When false, header shows $0 — no manual balances or imported positions to project from. */
  hasPortfolioBalances: boolean;
  marketScenarioId?: MarketScenarioId;
  /** When false, hide scenario pill and hero uses Base projections. */
  marketScenarioActive?: boolean;
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
  ssIncluded,
  onSsIncluded,
  ssClaimAge,
  onSsClaimAgeChange,
  ssTimingConfigured,
  onOpenSsConfig,
  hasPortfolioBalances,
  marketScenarioId = "base",
  marketScenarioActive = false,
}: Props) {
  const grossAnim = useAnimatedScalar(grossMon);
  const totalFvAnim = useAnimatedScalar(totalFV);

  const incomePhase = phase === "income";
  const showMarketScenarioPill =
    !incomePhase &&
    hasPortfolioBalances &&
    !marketScenarioIsBase(marketScenarioId) &&
    marketScenarioActive;
  const marketScenarioLabel = showMarketScenarioPill
    ? getMarketScenarioDefinition(marketScenarioId).label
    : "";
  const marketScenarioPillClass = showMarketScenarioPill
    ? subheaderMarketScenarioPillClass(marketScenarioId)
    : "";

  const showSsClaimPicker = incomePhase && ssTimingConfigured && ssIncluded;
  /** Reserve hero height/padding when SS is configured so toggling include does not shift the amount. */
  const reserveSsClaimSlot = incomePhase && ssTimingConfigured;

  return (
    <header
      className={`subheader${incomePhase ? " subheader--phase-income" : ""}${reserveSsClaimSlot ? " subheader--ss-claim-slot" : ""}${!hasPortfolioBalances ? " subheader--no-balances" : ""}`}
    >
      <div className="subheader-waves">
        <div className="subheader-waves__bubbles" aria-hidden>
          <svg
            className="subheader-bubble subheader-bubble--back"
            viewBox="0 0 1000 100"
            preserveAspectRatio="xMidYMax slice"
          >
            <path d={SUBHEADER_WAVE_BACK_D} fill="var(--nav-bg)" />
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
              />
              <div
                id="subheader-phase-growth-panel"
                className="subheader-phase-segment__sr"
                role="tabpanel"
                hidden={phase !== "growth"}
              >
                Growth phase
              </div>
              <div
                id="subheader-phase-income-panel"
                className="subheader-phase-segment__sr"
                role="tabpanel"
                hidden={phase !== "income"}
              >
                Income phase
              </div>
            </div>

            <div className="subheader-estimate__center">
              <div key={phase} className="subheader-estimate__swap">
                <div className="subheader-estimate__value subheader-estimate__value--enter">
                  <span className="subheader-estimate__value-num">
                    {incomePhase ? fmt(grossAnim) : fmt(totalFvAnim)}
                  </span>
                  <span className="subheader-estimate__value-suffix">
                    {incomePhase ? "/mo" : `/at ${targetRetirementAge}`}
                  </span>
                </div>
                {showMarketScenarioPill ? (
                  <span
                    className={[
                      "font-xs",
                      "subheader-market-scenario-pill",
                      "subheader-estimate__note--enter",
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
                    <div className="subheader-ss-block">
                      <div
                        className="subheader-estimate__note subheader-estimate__note--ss-row"
                        role="group"
                        aria-label="Include Social Security in expected monthly income"
                      >
                        {ssTimingConfigured ? (
                          <>
                            <span className="font-xs subheader-ss-toggle__text">
                              Include Social Security
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={ssIncluded}
                              aria-label="Include Social Security in expected monthly income"
                              className={`subheader-ss-toggle__switch${ssIncluded ? " subheader-ss-toggle__switch--on" : ""}`}
                              onClick={() => onSsIncluded(!ssIncluded)}
                            >
                              <span
                                className="subheader-ss-toggle__track"
                                aria-hidden
                              />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="font-xs subheader-ss-add-btn"
                            onClick={onOpenSsConfig}
                          >
                            Add Social Security
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            {reserveSsClaimSlot ? (
              <div className="subheader-estimate__bottom">
                <div
                  className={`subheader-estimate__claim-reveal${showSsClaimPicker ? " subheader-estimate__claim-reveal--visible" : ""}`}
                  aria-hidden={!showSsClaimPicker}
                >
                  <SubheaderClaimAgePicker
                    value={ssClaimAge}
                    onChange={onSsClaimAgeChange}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
