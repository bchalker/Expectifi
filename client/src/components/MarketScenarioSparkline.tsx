import { useEffect, useId, useMemo, useState } from "react";
import type { MarketScenarioId } from "../lib/marketScenario";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmt } from "../utils/format";
import type { MarketScenarioProjectionSeries } from "../lib/marketScenarioProjection";
import "./MarketScenarioSparkline.scss";

export type MarketScenarioSparklineDeltaTone =
  | "positive"
  | "negative"
  | "neutral";

export type MarketScenarioSparklineProps = {
  series: MarketScenarioProjectionSeries;
  scenarioLabel: string;
  deltaLabel: string;
  deltaTone: MarketScenarioSparklineDeltaTone;
  retirementYear: number;
  /** When false, hide the vs. Base delta callout (e.g. scenario paused). */
  showDeltaHeadline?: boolean;
  /** Grayscale chart lines and fills; legend keeps scenario colors. */
  chartPaused?: boolean;
  /** Changes trigger chart entrance + Recharts path animation. */
  animationKey?: MarketScenarioId | string;
  className?: string;
};

const CHART_ANIMATION_MS = 560;

function useChartMotionEnabled(): boolean {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(!mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return enabled;
}

type ChartRow = {
  year: number;
  yearLabel: string;
  base: number;
  scenario: number;
};

/** 2-digit year for axis ('26). */
function formatAxisYear(year: number): string {
  const yy = year % 100;
  return `'${String(yy).padStart(2, "0")}`;
}

type ChartTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartRow }>;
};

function MarketScenarioChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div
      className="market-scenario-sparkline__tooltip market-scenario-sparkline__tooltip--chart"
      role="status"
    >
      <span className="market-scenario-sparkline__tooltip-year">
        {row.year}
      </span>
      <span className="market-scenario-sparkline__tooltip-line market-scenario-sparkline__tooltip-line--base">
        Base: {fmt(row.base)}
      </span>
      <span className="market-scenario-sparkline__tooltip-line market-scenario-sparkline__tooltip-line--scenario">
        Scenario: {fmt(row.scenario)}
      </span>
    </div>
  );
}

export function MarketScenarioSparkline({
  series,
  scenarioLabel,
  deltaLabel,
  deltaTone,
  retirementYear,
  showDeltaHeadline = true,
  chartPaused = false,
  animationKey = "default",
  className = "",
}: MarketScenarioSparklineProps) {
  const motionEnabled = useChartMotionEnabled();
  const rawId = useId().replace(/:/g, "");
  const baseGradientId = `market-scenario-base-fill-${rawId}`;
  const scenarioGradientId = `market-scenario-scenario-fill-${rawId}`;

  const chartData = useMemo<ChartRow[]>(
    () =>
      series.years.map((year, i) => ({
        year,
        yearLabel: formatAxisYear(year),
        base: series.baseValues[i] ?? 0,
        scenario: series.scenarioValues[i] ?? 0,
      })),
    [series.baseValues, series.scenarioValues, series.years],
  );

  const baseEnd = series.baseValues[series.baseValues.length - 1] ?? 0;
  const scenarioEnd =
    series.scenarioValues[series.scenarioValues.length - 1] ?? 0;
  const endpointYear = series.years[series.years.length - 1] ?? retirementYear;
  const xAxisInterval = chartData.length > 10 ? 1 : 0;

  const seriesAnimProps = motionEnabled
    ? {
        isAnimationActive: true as const,
        animationDuration: CHART_ANIMATION_MS,
        animationEasing: "ease-out" as const,
      }
    : { isAnimationActive: false as const };

  return (
    <div
      className={[
        "market-scenario-sparkline",
        "market-scenario-sparkline--color-transition",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="market-scenario-sparkline__chart-wrap">
        <div
          key={animationKey}
          className={[
            "market-scenario-sparkline__chart-canvas",
            chartPaused && "market-scenario-sparkline__chart-canvas--chart-only",
            motionEnabled && "market-scenario-sparkline__chart-canvas--enter",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {showDeltaHeadline ? (
            <div
              className={[
                "market-scenario-sparkline__delta-headline",
                `market-scenario-sparkline__delta-headline--${deltaTone}`,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <p className="market-scenario-sparkline__delta-value">
                {deltaLabel}
              </p>
              <p className="market-scenario-sparkline__delta-caption">
                vs. Base by {endpointYear}
              </p>
            </div>
          ) : null}

          <div
            className={[
              "market-scenario-sparkline__chart-visual",
              chartPaused && "market-scenario-sparkline__chart-visual--paused",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <ResponsiveContainer
              className="market-scenario-sparkline__responsive"
              width="100%"
              height="100%"
            >
              <ComposedChart
              key={animationKey}
              data={chartData}
              margin={{ top: 12, right: 14, left: 8, bottom: 0 }}
              className="market-scenario-sparkline__composed"
            >
              <defs>
                <linearGradient id={baseGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    className="market-scenario-sparkline__gradient-stop market-scenario-sparkline__gradient-stop--base-top"
                  />
                  <stop
                    offset="100%"
                    className="market-scenario-sparkline__gradient-stop market-scenario-sparkline__gradient-stop--base-bottom"
                  />
                </linearGradient>
                <linearGradient
                  id={scenarioGradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    className="market-scenario-sparkline__gradient-stop market-scenario-sparkline__gradient-stop--scenario-top"
                  />
                  <stop
                    offset="100%"
                    className="market-scenario-sparkline__gradient-stop market-scenario-sparkline__gradient-stop--scenario-bottom"
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                className="market-scenario-sparkline__grid"
                vertical
                horizontal={false}
                stroke="var(--market-scenario-grid-stroke)"
              />
              <XAxis
                dataKey="yearLabel"
                axisLine={false}
                tickLine={false}
                interval={chartPaused ? "preserveStartEnd" : xAxisInterval}
                tick={chartPaused ? false : { className: "market-scenario-sparkline__axis-tick" }}
                padding={{ left: 0, right: 0 }}
              />
              <YAxis hide domain={["dataMin", "dataMax"]} />
              {!chartPaused ? (
                <Tooltip
                  content={(props) => (
                    <MarketScenarioChartTooltip
                      active={props.active}
                      payload={props.payload}
                    />
                  )}
                  cursor={{
                    stroke: "var(--border)",
                    strokeWidth: 1,
                    strokeDasharray: "4 3",
                  }}
                  wrapperClassName="market-scenario-sparkline__tooltip-wrapper"
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="base"
                fill={`url(#${baseGradientId})`}
                stroke="none"
                {...seriesAnimProps}
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="scenario"
                fill={`url(#${scenarioGradientId})`}
                stroke="none"
                {...seriesAnimProps}
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="base"
                stroke="var(--market-scenario-sparkline-base)"
                strokeWidth={1.75}
                strokeDasharray="4 3"
                dot={false}
                activeDot={{
                  className:
                    "market-scenario-sparkline__active-dot market-scenario-sparkline__active-dot--base",
                  r: 3,
                }}
                {...seriesAnimProps}
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="scenario"
                stroke="var(--market-scenario-chart-line, var(--accent-text))"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  className:
                    "market-scenario-sparkline__active-dot market-scenario-sparkline__active-dot--scenario",
                  r: 3,
                }}
                {...seriesAnimProps}
                legendType="none"
              />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {!chartPaused ? (
            <div className="market-scenario-sparkline__legend-pill" aria-hidden>
              <span className="market-scenario-sparkline__legend-item market-scenario-sparkline__legend-item--scenario">
                <span
                  className="market-scenario-sparkline__legend-dot"
                  aria-hidden
                />
                <span className="market-scenario-sparkline__legend-text">
                  {scenarioLabel} · {fmt(scenarioEnd)}
                </span>
              </span>
              <span className="market-scenario-sparkline__legend-item market-scenario-sparkline__legend-item--base">
                <span
                  className="market-scenario-sparkline__legend-dash"
                  aria-hidden
                />
                <span className="market-scenario-sparkline__legend-text">
                  Base · {fmt(baseEnd)}
                </span>
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
