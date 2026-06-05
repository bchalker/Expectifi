import {
  IconArrowNarrowDownDashed,
  IconTrendingDown,
  IconTrendingUp,
  IconTransfer,
} from "@tabler/icons-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { normalizeImportSymbol } from "../lib/positionsCsv";
import { formatHoldingDescription } from "../lib/holdingsDisplay";
import {
  inferScenarioUiChoice,
  scenarioColumnShortLabel,
  HOLDING_ROW_SCENARIO_SUBLABEL,
} from "../lib/holdingScenarioApply";
import { HoldingsScenarioBadge } from "./HoldingsScenarioBadge";
import {
  blendedBaselineFV,
  positionUsesCustomReturnMode,
  projectPositionAtRetirement,
  type PositionReturnModel,
} from "../lib/positionReturnModel";
import { fmt } from "../utils/format";
import { RangeInlineWithValuePinRow } from "./StripSliderValuePin";
import "./HoldingScenarioPopout.scss";
import "./GrowthSliderLabel.scss";

function fmtSignedDeltaMoney(n: number): string {
  return (n >= 0 ? "+" : "") + fmt(n);
}

export type GrowthSliderLabelProps = {
  rate: number;
  /** When set, overrides `rate * 100` for the animated headline (e.g. strip tween). */
  ratePctDisplay?: number;
  positions: PositionReturnModel[];
  blendedRate: number;
  /** Fidelity taxable import lines; custom suffix uses `brkBlendedRate` vs each line. */
  brokeragePositionModels?: PositionReturnModel[];
  brkBlendedRate?: number;
  retirementYear: number;
  horizon: number;
  retirementAge: number;
  onEditPosition: (positionId: string) => void;
  /** Clear stored return overrides for these position ids (usually one ticker → many accounts). */
  onRemovePositionReturn: (positionIds: string[]) => void;
  /** Range input for the strip slider row (value pin renders above the track). */
  sliderTrack: ReactNode;
  /** Min/max tick labels for the range row. */
  sliderTicks: ReactNode;
  /** Hide default helper copy below the track (Fine-tune guide supplies context). */
  hideDefaultHelperText?: boolean;
  /** Panel column: stack default label, arrow, and exception rows. */
  suffixLayout?: "inline" | "panel";
};

export function GrowthSliderLabel({
  rate,
  ratePctDisplay,
  positions,
  blendedRate,
  brokeragePositionModels,
  brkBlendedRate,
  retirementYear,
  horizon,
  retirementAge,
  onEditPosition,
  onRemovePositionReturn,
  sliderTrack,
  sliderTicks,
  hideDefaultHelperText = false,
  suffixLayout = "inline",
}: GrowthSliderLabelProps) {
  const h = Math.max(1, Math.min(50, horizon));

  const brkList = brokeragePositionModels ?? [];
  const brkBlend = brkBlendedRate ?? blendedRate;

  function blendedFor(p: PositionReturnModel): number {
    return p.id.startsWith("fid-brk-") ? brkBlend : blendedRate;
  }

  function positionIdsForTickerKey(tickerKeyUpper: string): string[] {
    const k = tickerKeyUpper.trim().toUpperCase();
    if (!k) return [];
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const q of positions) {
      if (normalizeImportSymbol(q.ticker).toUpperCase() !== k) continue;
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      ids.push(q.id);
    }
    for (const q of brkList) {
      if (normalizeImportSymbol(q.ticker).toUpperCase() !== k) continue;
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      ids.push(q.id);
    }
    return ids;
  }

  const customRet = positions.filter((p) =>
    positionUsesCustomReturnMode(p, blendedRate),
  );
  const customBrk = brkList.filter((p) =>
    positionUsesCustomReturnMode(p, brkBlend),
  );
  const customPositions = [...customRet, ...customBrk];

  const customPositionsForSuffix = useMemo(() => {
    const seen = new Set<string>();
    const out: PositionReturnModel[] = [];
    for (const p of customPositions) {
      const k = normalizeImportSymbol(p.ticker).toUpperCase();
      const dedupeKey = k || p.id;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push(p);
    }
    return out;
  }, [customPositions]);

  const hasCustom = customPositions.length > 0;
  const allRetCustom =
    positions.length === 0 ||
    positions.every((p) => positionUsesCustomReturnMode(p, blendedRate));
  const allBrkCustom =
    brkList.length === 0 ||
    brkList.every((p) => positionUsesCustomReturnMode(p, brkBlend));
  const hasImportLines = positions.length > 0 || brkList.length > 0;
  const allCustom = hasImportLines && allRetCustom && allBrkCustom;

  const headlinePct = (ratePctDisplay ?? rate * 100).toFixed(1);

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number>(0);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = 0;
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setHoverId(null);
      setAnchor(null);
    }, 220);
  }, [clearCloseTimer]);

  const [popStyle, setPopStyle] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });

  useLayoutEffect(() => {
    if (!anchor) return;
    const half = 120;
    const x = Math.min(
      window.innerWidth - half - 8,
      Math.max(half + 8, anchor.left + anchor.width / 2),
    );
    setPopStyle({ left: x, top: anchor.top });
  }, [anchor, hoverId]);

  useEffect(() => {
    if (!hoverId) return;
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (
        (e.target as HTMLElement | null)?.closest?.(
          "[data-growth-slider-ticker]",
        )
      )
        return;
      setHoverId(null);
      setAnchor(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [hoverId]);

  const openForTicker = (id: string, el: HTMLElement) => {
    clearCloseTimer();
    const r = el.getBoundingClientRect();
    setHoverId(id);
    setAnchor({ left: r.left, top: r.top, width: r.width });
  };

  const hovered = hoverId
    ? customPositions.find((p) => p.id === hoverId)
    : undefined;

  function popoverInner(p: PositionReturnModel) {
    const b = blendedFor(p);
    const scenarioChoice = inferScenarioUiChoice(p, b, h);
    const scenarioLabel = scenarioColumnShortLabel(
      scenarioChoice,
      scenarioChoice === "custom" ? p.flatRate : undefined,
    );
    const projected = projectPositionAtRetirement(p, retirementYear, h);
    const baseline = blendedBaselineFV(p.currentValue, b, h);
    const delta = projected - baseline;
    const posDelta = delta >= 0;

    return (
      <>
        <div className="growth-slider-hover-pop__head">
          <p className="growth-slider-hover-pop__symbol">{p.ticker || "—"}</p>
          <p className="growth-slider-hover-pop__desc" title={p.label}>
            {formatHoldingDescription(p.label)}
          </p>
        </div>
        <div className="growth-slider-hover-pop__rule" />
        <HoldingsScenarioBadge
          className="growth-slider-hover-pop__scenario-badge"
          label={scenarioLabel}
          choice={scenarioChoice}
          sublabel={HOLDING_ROW_SCENARIO_SUBLABEL}
        />
        <div className="growth-slider-hover-pop__rule" />
        <div className="growth-slider-hover-pop__footer">
          Projected at {retirementAge}: {fmt(projected)}
        </div>
        <div
          className={`growth-slider-hover-pop__delta${posDelta ? " growth-slider-hover-pop__delta--pos" : " growth-slider-hover-pop__delta--neg"}`}
        >
          <span>vs default: {fmtSignedDeltaMoney(delta)}</span>
          {posDelta ? (
            <IconTrendingUp size={12} stroke={2} aria-hidden />
          ) : (
            <IconTrendingDown size={12} stroke={2} aria-hidden />
          )}
        </div>
        <div className="growth-slider-hover-pop__actions">
          <button
            type="button"
            className="growth-slider-hover-pop__remove"
            aria-label={`Remove custom return overrides for ${p.ticker || "this holding"} (all accounts)`}
            onClick={() => {
              const tk = normalizeImportSymbol(p.ticker).toUpperCase();
              const ids = tk ? positionIdsForTickerKey(tk) : [p.id];
              onRemovePositionReturn(ids.length ? ids : [p.id]);
              clearCloseTimer();
              setHoverId(null);
              setAnchor(null);
            }}
          >
            Remove
          </button>
        </div>
      </>
    );
  }

  function scenarioLabelFor(p: PositionReturnModel): string {
    const b = blendedFor(p);
    const scenarioChoice = inferScenarioUiChoice(p, b, h);
    return scenarioColumnShortLabel(
      scenarioChoice,
      scenarioChoice === "custom" ? p.flatRate : undefined,
    );
  }

  function renderInlineSuffix() {
    if (suffixLayout === "panel") return null;

    if (!hasCustom) {
      if (hideDefaultHelperText) return null;
      return (
        <>
          <p className="growth-slider-label__suffix-line">
            Default rate for all holdings
          </p>
          <p className="growth-slider-label__suffix-note">
            Applied to all holdings set to Global in their scenario.
          </p>
        </>
      );
    }

    return (
      <p className="growth-slider-label__suffix-line">
        <span className="growth-slider-label__suffix">
          {allCustom
            ? "Default rate for non-position balances"
            : "Default rate for all, except"}
        </span>
        {!allCustom ? (
          <span className="growth-slider-label__tickers">
            {customPositionsForSuffix.map((p, i) => (
              <span key={p.id}>
                {i > 0 ? ", " : " "}
                <button
                  type="button"
                  data-growth-slider-ticker
                  className="growth-slider-label__ticker"
                  onMouseEnter={(e) => openForTicker(p.id, e.currentTarget)}
                  onMouseLeave={scheduleClose}
                >
                  {p.ticker || "—"}
                </button>
              </span>
            ))}
          </span>
        ) : null}
      </p>
    );
  }

  function renderPanelSuffix() {
    if (suffixLayout !== "panel" || !hasCustom) return null;

    return (
      <div className="growth-slider-label__panel-exceptions">
        <p className="growth-slider-label__panel-default">
          {allCustom
            ? "Default rate for non-position balances"
            : "Default rate for all, except"}
        </p>
        {!allCustom ? (
          <>
            <IconArrowNarrowDownDashed
              className="growth-slider-label__panel-arrow"
              size={16}
              stroke={1.5}
              aria-hidden
            />
            <ul className="growth-slider-label__exception-list">
              {customPositionsForSuffix.map((p) => (
                <li key={p.id} className="growth-slider-label__exception-row">
                  <button
                    type="button"
                    data-growth-slider-ticker
                    className="growth-slider-label__exception-symbol"
                    onMouseEnter={(e) => openForTicker(p.id, e.currentTarget)}
                    onMouseLeave={scheduleClose}
                  >
                    {p.ticker || "—"}
                  </button>
                  <span className="growth-slider-label__exception-scenario">
                    {scenarioLabelFor(p)}
                  </span>
                  <button
                    type="button"
                    className="growth-slider-label__exception-transfer"
                    aria-label={`Open scenario for ${p.ticker || "holding"}`}
                    onClick={() => onEditPosition(p.id)}
                  >
                    <IconTransfer size={14} stroke={1.5} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="growth-slider-label">
      <div className="strip-equation-sliders-group">
        {suffixLayout === "panel" ? (
          <>
            <div className="growth-slider-label__panel-heading">
              <p className="growth-slider-label__panel-rate-lead">
                I expect to grow at
              </p>
              <div className="growth-slider-label__panel-rate" aria-live="polite">
                <span className="growth-slider-label__panel-rate-pct strip-equation-main-val--tween">
                  {headlinePct}%
                </span>
                <span className="growth-slider-label__panel-rate-caption">
                  annual return
                </span>
              </div>
            </div>
            <div className="range-inline-row growth-slider-label__panel-track">
              <div className="range-inline-track-wrap">{sliderTrack}</div>
              {sliderTicks}
            </div>
          </>
        ) : (
          <RangeInlineWithValuePinRow
            pinPct={`${headlinePct}%`}
            pinCaption="annual return"
            pinPctClassName="strip-equation-main-val--tween"
            track={sliderTrack}
            ticks={sliderTicks}
          />
        )}
        {renderInlineSuffix()}
      </div>

      {renderPanelSuffix()}

      {hasCustom && hovered && anchor
        ? createPortal(
            <div
              ref={popoverRef}
              className="growth-slider-hover-pop"
              style={{ left: popStyle.left, top: popStyle.top }}
              onMouseEnter={clearCloseTimer}
              onMouseLeave={scheduleClose}
            >
              {popoverInner(hovered)}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
