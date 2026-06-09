import { useCallback, useMemo } from "react";
import {
  blendedGrowthRate,
  type LifeEventsProjectionData,
} from "../lib/calc/lifeEvents";
import GrowthEventCard from "./life-events/GrowthEventCard";
import { LifeEventsSidebar } from "./life-events/LifeEventsSidebar";
import { growthEventConfigs } from "./life-events/eventConfigs";
import {
  calcEventImpactFutureValue,
  calcEventValues,
  calcHsaOffset,
  isMedicalEventExtras,
} from "./life-events/utils";
import type { LifeEventConfig, LifeEventState } from "./life-events/types";
import "./LifeEventsPanel.scss";

export type LifeEventActiveImpact = {
  portfolioDelta: number;
  monthlyIncomeDelta: number;
};

export interface LifeEventsPanelProps {
  projectionData: LifeEventsProjectionData;
  retirementYear: number;
  monthlyPortfolioIncome: number;
  activePhase: "growth" | "income";
  withdrawalRate: number;
  hsaBalance: number;
  eventStates: LifeEventState[];
  onEventStatesChange: (states: LifeEventState[]) => void;
  onEventActiveChange?: (
    eventId: string,
    isActive: boolean,
    impact: LifeEventActiveImpact,
  ) => void;
  className?: string;
}

function lifeEventCountWord(count: number): string {
  const words = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
  ];
  return words[count] ?? String(count);
}

function lifeEventCountTitle(count: number): { word: string; noun: string } {
  return {
    word: lifeEventCountWord(count),
    noun: count === 1 ? "Life Event" : "Life Events",
  };
}

function calcTotalActiveImpact(
  eventStates: LifeEventState[],
  retirementYear: number,
  growthRate: number,
  configs: LifeEventConfig[],
  hsaBalance: number,
): number {
  return eventStates
    .filter((s) => s.isActive)
    .reduce((sum, s) => {
      const config = configs.find((c) => c.id === s.configId);
      if (!config) return sum;
      const fv = calcEventImpactFutureValue(
        config,
        s.amount,
        s.year,
        retirementYear,
        growthRate,
        hsaBalance,
        s.duration,
      );
      const isOutflow = config.type.includes("out");
      return sum + (isOutflow ? fv : -fv);
    }, 0);
}

function calcOtherActiveImpact(
  excludeId: string,
  eventStates: LifeEventState[],
  retirementYear: number,
  growthRate: number,
  configs: LifeEventConfig[],
  hsaBalance: number,
): number {
  return eventStates
    .filter((s) => s.isActive && s.configId !== excludeId)
    .reduce((sum, s) => {
      const config = configs.find((c) => c.id === s.configId);
      if (!config) return sum;
      const fv = calcEventImpactFutureValue(
        config,
        s.amount,
        s.year,
        retirementYear,
        growthRate,
        hsaBalance,
        s.duration,
      );
      const isOutflow = config.type.includes("out");
      return sum + (isOutflow ? fv : -fv);
    }, 0);
}

export function LifeEventsPanel({
  projectionData,
  retirementYear,
  monthlyPortfolioIncome: _monthlyPortfolioIncome,
  activePhase,
  withdrawalRate: _withdrawalRate,
  hsaBalance,
  eventStates,
  onEventStatesChange,
  onEventActiveChange = () => {},
  className = "",
}: LifeEventsPanelProps) {
  const currentYear = projectionData.currentYear;
  const retirementPortfolio = projectionData.baselineTotalAtRetirement;
  const growthRate = blendedGrowthRate(projectionData);

  const updateEventState = useCallback(
    (id: string, updates: Partial<LifeEventState>) => {
      onEventStatesChange(
        eventStates.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      );
    },
    [eventStates, onEventStatesChange],
  );

  const totalActiveImpact = useMemo(
    () =>
      calcTotalActiveImpact(
        eventStates,
        retirementYear,
        growthRate,
        growthEventConfigs,
        hsaBalance,
      ),
    [eventStates, retirementYear, growthRate, hsaBalance],
  );

  const activeEventCount = useMemo(
    () => eventStates.filter((s) => s.isActive).length,
    [eventStates],
  );

  const activeEventTitle = useMemo(
    () => (activeEventCount > 0 ? lifeEventCountTitle(activeEventCount) : null),
    [activeEventCount],
  );

  const activeEventSummaries = useMemo(() => {
    return eventStates
      .filter((s) => s.isActive)
      .map((state) => {
        const config = growthEventConfigs.find((c) => c.id === state.configId);
        if (!config) return null;
        const yearValue = Math.min(
          Math.max(state.year, currentYear),
          Math.max(currentYear, retirementYear - 1),
        );
        const durationValue = state.duration ?? config.defaultDuration ?? 1;
        const hsaResult = isMedicalEventExtras(config.extras)
          ? calcHsaOffset(state.amount, hsaBalance)
          : null;
        const calcAmount = config.isRecurring
          ? state.amount
          : hsaResult
            ? hsaResult.netExpense
            : state.amount;
        const { futureValue, rating: calcRating } = calcEventValues(
          calcAmount,
          yearValue,
          retirementYear,
          retirementPortfolio,
          growthRate,
          config.isRecurring,
          durationValue,
        );
        const rating =
          hsaResult?.fullyCovered === true ? "minimal" : calcRating;
        return {
          id: state.id,
          label: config.canonicalLabel,
          futureValue,
          rating,
        };
      })
      .filter((entry) => entry != null);
  }, [
    eventStates,
    currentYear,
    retirementYear,
    retirementPortfolio,
    growthRate,
    hsaBalance,
  ]);

  const handleActiveChange = useCallback(
    (id: string, isActive: boolean, futureValue: number) => {
      onEventActiveChange(id, isActive, {
        portfolioDelta: isActive ? -futureValue : 0,
        monthlyIncomeDelta: 0,
      });
    },
    [onEventActiveChange],
  );

  const panelClassName = ["life-events-panel", className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {activePhase === "income" ? (
        <header className="life-events-panel__header account-balances-header-row">
          <div className="account-balances-header-row__title-block">
            <h2
              id="life-events-heading"
              className="account-balances-header-row__title"
            >
              Life events — income phase
            </h2>
            <p className="account-balances-header-row__subtitle account-balances-header-row__subtitle--note">
              Moments that affect your monthly draw and portfolio runway after
              retirement
            </p>
          </div>
        </header>
      ) : (
        <header className="life-events-panel__header account-balances-header-row">
          <div className="account-balances-header-row__title-block">
            <h2
              id="life-events-heading"
              className="account-balances-header-row__title"
            >
              {activeEventTitle ? (
                <>
                  {activeEventTitle.word}{" "}
                  <span className="life-events-panel__active-count">
                    ({activeEventCount})
                  </span>{" "}
                  {activeEventTitle.noun}
                </>
              ) : (
                "Life events"
              )}
            </h2>
            <p className="account-balances-header-row__subtitle account-balances-header-row__subtitle--note">
              Moments that pull from your compounding portfolio before
              retirement
            </p>
          </div>
        </header>
      )}

      <section className={panelClassName} aria-labelledby="life-events-heading">
        {activePhase === "income" ? (
          <div className="life-events-panel__income-empty">
            <p className="life-events-panel__income-empty-text">
              No income phase events yet.
            </p>
            <p className="life-events-panel__income-empty-subtext">
              Switch to growth phase to model expenses before retirement.
            </p>
          </div>
        ) : (
          <div className="life-events-panel__layout">
            <div className="life-events-panel__cards">
            {eventStates.map((state) => {
              const config = growthEventConfigs.find(
                (c) => c.id === state.configId,
              );
              if (!config) return null;
              return (
                <GrowthEventCard
                  key={state.id}
                  config={config}
                  state={state}
                  retirementYear={retirementYear}
                  retirementPortfolio={retirementPortfolio}
                  currentYear={currentYear}
                  growthRate={growthRate}
                  otherActiveImpact={calcOtherActiveImpact(
                    state.configId,
                    eventStates,
                    retirementYear,
                    growthRate,
                    growthEventConfigs,
                    hsaBalance,
                  )}
                  hsaBalance={hsaBalance}
                  onStateChange={updateEventState}
                  onActiveChange={handleActiveChange}
                />
              );
            })}
          </div>
          <LifeEventsSidebar
            activeEvents={activeEventSummaries}
            totalImpact={totalActiveImpact}
          />
          </div>
        )}
      </section>
    </>
  );
}
