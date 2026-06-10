// @ts-nocheck — legacy card; preserved until removed. Replaced by LifeEventTypeCard.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { IconChevronDown, IconShieldCheckFilled } from "@tabler/icons-react";
import type { LifeEventConfig, LifeEventState } from "./types";
import {
  calcEventValues,
  calcFutureValue,
  calcHsaOffset,
  calcMortgageBreakEvenRate,
  calcMortgageTradeoff,
  formatCollapsedEventSummary,
  formatCurrency,
  formatCurrencyCompact,
  formatMortgageBreakEvenSentence,
  isMedicalEventExtras,
  isMortgageEventExtras,
  lifeEventRangeFillStyle,
} from "./utils";
import {
  deriveMortgageLifeEvent,
  getMortgagePayoffYearBounds,
  MORTGAGE_LOAN_TERM_YEARS,
  normalizeMortgageLoanStartYear,
  normalizeMortgageLoanTermYears,
} from "../../lib/calc/mortgageLifeEvent";
import { fmtInput, parseNum } from "../../utils/format";
import { CurrencyAmountInput } from "../ui/CurrencyAmountInput";
import { AppSelect } from "../ui/AppSelect";
import ImpactRatingBadge from "./ImpactRatingBadge";
import { LifeEventPercentInput } from "./LifeEventPercentInput";
import { LifeEventYearInput } from "./LifeEventYearInput";
import { MortgagePayoffSlider } from "./MortgagePayoffSlider";
import "../LifeEventsPanel.scss";

export interface GrowthEventCardProps {
  config: LifeEventConfig;
  state: LifeEventState;
  retirementYear: number;
  retirementPortfolio: number;
  currentYear: number;
  growthRate: number;
  hsaBalance: number;
  onStateChange: (id: string, updates: Partial<LifeEventState>) => void;
  onActiveChange: (id: string, isActive: boolean, futureValue: number) => void;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface LifeEventFieldValueProps {
  id: string;
  value: number;
  onCommit: (value: number) => void;
  min: number;
  max: number;
  ariaLabel: string;
  prefix?: string;
  suffix?: string;
  formatDisplay: (value: number) => string;
  parseDisplay?: (raw: string) => number;
  round?: (value: number) => number;
}

function LifeEventFieldValue({
  id,
  value,
  onCommit,
  min,
  max,
  ariaLabel,
  prefix,
  suffix,
  formatDisplay,
  parseDisplay = parseNum,
  round = Math.round,
}: LifeEventFieldValueProps) {
  const [text, setText] = useState(() => formatDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatDisplay(value));
  }, [value, focused, formatDisplay]);

  const commit = () => {
    const next = clampNumber(round(parseDisplay(text)), min, max);
    onCommit(next);
    setText(formatDisplay(next));
  };

  return (
    <div className="life-events-field__value-input-wrap">
      {prefix ? (
        <span className="life-events-field__value-affix" aria-hidden>
          {prefix}
        </span>
      ) : null}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="life-events-field__value-input"
        value={text}
        size={Math.max(text.length, 1)}
        aria-label={ariaLabel}
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          commit();
          setFocused(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            e.currentTarget.blur();
          }
        }}
      />
      {suffix ? (
        <span className="life-events-field__value-affix" aria-hidden>
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function enrichTradeoffVerdict(text: string): ReactNode {
  const pattern = /\d+\.\d{1,2}%|\$[\d,]+/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));
    nodes.push(<strong key={index}>{match[0]}</strong>);
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length > 0 ? <>{nodes}</> : text;
}

function TradeoffRecommendedPill() {
  return (
    <span className="life-events-tradeoff__pill life-events-tradeoff__pill--card life-events-tradeoff__pill--recommended">
      <IconShieldCheckFilled size={12} aria-hidden />
      Recommended
    </span>
  );
}

interface HsaAnalysisBlockProps {
  hsaResult: ReturnType<typeof calcHsaOffset>;
  hsaBalance: number;
  hsaSavings: number;
}

function HsaAnalysisBlock({
  hsaResult,
  hsaBalance,
  hsaSavings,
}: HsaAnalysisBlockProps) {
  const { grossExpense, hsaOffset, netExpense, fullyCovered, hasHsa } =
    hsaResult;

  if (fullyCovered) {
    return (
      <div className="life-events-hsa life-events-hsa--teal">
        <div className="life-events-hsa__header">
          <span className="life-events-hsa__header-label">
            Fully covered by HSA
          </span>
          <span className="life-events-hsa__pill life-events-hsa__pill--teal">
            No portfolio impact
          </span>
        </div>
        <p className="life-events-hsa__body">
          Your HSA balance of {formatCurrency(hsaBalance)} fully covers this
          expense. Your retirement portfolio is untouched. Your HSA is doing
          exactly what it was designed for.
        </p>
      </div>
    );
  }

  if (hasHsa && hsaOffset > 0) {
    return (
      <div className="life-events-hsa life-events-hsa--teal">
        <div className="life-events-hsa__header">
          <span className="life-events-hsa__header-label">HSA offset</span>
          <span className="life-events-hsa__pill life-events-hsa__pill--teal">
            HSA covers {formatCurrency(hsaOffset)}
          </span>
        </div>
        <div className="life-events-hsa__breakdown">
          <div className="life-events-hsa__breakdown-row">
            <span>Gross expense</span>
            <span>{formatCurrency(grossExpense)}</span>
          </div>
          <div className="life-events-hsa__breakdown-row life-events-hsa__breakdown-row--offset">
            <span>HSA offset</span>
            <span>-{formatCurrency(hsaOffset)}</span>
          </div>
          <div className="life-events-hsa__breakdown-divider" aria-hidden />
          <div className="life-events-hsa__breakdown-row life-events-hsa__breakdown-row--net">
            <span>Net portfolio hit</span>
            <span>{formatCurrency(netExpense)}</span>
          </div>
        </div>
        <p className="life-events-hsa__savings">
          Your HSA saves you {formatCurrency(hsaSavings)} in lost compounding
          compared to paying this from your retirement portfolio.
        </p>
      </div>
    );
  }

  return (
    <div className="life-events-hsa life-events-hsa--amber">
      <div className="life-events-hsa__header">
        <span className="life-events-hsa__header-label">No HSA on file</span>
        <span className="life-events-hsa__pill life-events-hsa__pill--amber">
          Consider an HSA
        </span>
      </div>
      <p className="life-events-hsa__body">
        The full {formatCurrency(grossExpense)} comes from your retirement
        portfolio. An HSA is one of the most tax-efficient tools for medical
        costs in retirement. Contributions go in pre-tax, grow tax-free, and
        withdraw tax-free for qualified medical expenses. Even a modest HSA
        balance reduces what retirement has to cover.
      </p>
    </div>
  );
}

export default function GrowthEventCard({
  config,
  state,
  retirementYear,
  retirementPortfolio,
  currentYear,
  growthRate,
  hsaBalance,
  onStateChange,
  onActiveChange,
}: GrowthEventCardProps) {
  const durationMin = config.durationMin ?? 1;
  const configDurationMax = config.durationMax ?? 20;

  const mortgageExtras = isMortgageEventExtras(config.extras)
    ? config.extras
    : null;
  const showHsaAnalysis = isMedicalEventExtras(config.extras);
  const showTradeoff = mortgageExtras?.showTradeoffAnalysis === true;

  const mortgageRate =
    state.mortgageRate ?? mortgageExtras?.mortgageRateDefault ?? 0.04;
  const monthlyPayment =
    state.mortgageMonthlyPayment ??
    mortgageExtras?.monthlyPaymentDefault ??
    1500;
  const loanTermYears = normalizeMortgageLoanTermYears(
    state.mortgageLoanTermYears,
  );
  const loanStartYear = normalizeMortgageLoanStartYear(
    state.mortgageLoanStartYear,
    currentYear,
  );

  const mortgagePayoffBounds = useMemo(() => {
    if (!showTradeoff) return null;
    return getMortgagePayoffYearBounds(
      currentYear,
      retirementYear,
      loanTermYears,
      loanStartYear,
    );
  }, [showTradeoff, currentYear, retirementYear, loanTermYears, loanStartYear]);

  const yearMin = showTradeoff
    ? (mortgagePayoffBounds?.payoffYearMin ?? currentYear + 1)
    : currentYear;
  const yearMax = retirementYear;
  const yearValue = Math.min(Math.max(state.year, yearMin), yearMax);

  const durationMax = config.isRecurring
    ? Math.min(
        configDurationMax,
        Math.max(durationMin, retirementYear - yearValue + 1),
      )
    : configDurationMax;
  const durationValue = Math.min(
    Math.max(state.duration ?? config.defaultDuration ?? 1, durationMin),
    durationMax,
  );

  useEffect(() => {
    if (state.year === yearValue) return;
    onStateChange(state.id, { year: yearValue });
  }, [state.id, state.year, yearValue, onStateChange]);

  useEffect(() => {
    if (!config.isRecurring || state.duration === durationValue) return;
    onStateChange(state.id, { duration: durationValue });
  }, [
    config.isRecurring,
    state.id,
    state.duration,
    durationValue,
    onStateChange,
  ]);

  const mortgageDerived = useMemo(() => {
    if (!showTradeoff) return null;
    return deriveMortgageLifeEvent(
      state.amount,
      mortgageRate,
      monthlyPayment,
      yearValue,
      currentYear,
      retirementYear,
      loanTermYears,
      loanStartYear,
    );
  }, [
    showTradeoff,
    state.amount,
    mortgageRate,
    monthlyPayment,
    yearValue,
    currentYear,
    retirementYear,
    loanTermYears,
    loanStartYear,
  ]);

  const hsaResult = showHsaAnalysis
    ? calcHsaOffset(state.amount, hsaBalance)
    : null;
  const lumpImpactAmount = hsaResult ? hsaResult.netExpense : state.amount;
  const calcAmount = config.isRecurring ? state.amount : lumpImpactAmount;
  const headerAmount = config.isRecurring
    ? state.amount
    : hsaResult && hsaResult.hsaOffset > 0
      ? hsaResult.netExpense
      : state.amount;

  const {
    futureValue,
    totalOutflow,
    rating: calcRating,
  } = calcEventValues(
    calcAmount,
    yearValue,
    retirementYear,
    retirementPortfolio,
    growthRate,
    config.isRecurring,
    durationValue,
  );

  const futureValueWithoutHsa = showHsaAnalysis
    ? calcEventValues(
        state.amount,
        yearValue,
        retirementYear,
        retirementPortfolio,
        growthRate,
        false,
      ).futureValue
    : futureValue;
  const hsaSavings = futureValueWithoutHsa - futureValue;

  const rating = hsaResult?.fullyCovered === true ? "minimal" : calcRating;

  useEffect(() => {
    if (state.isActive) {
      onActiveChange(state.id, true, futureValue);
    }
  }, [state.id, state.isActive, futureValue, onActiveChange]);

  const cardClassName = [
    "life-events-panel__card",
    state.isActive && "life-events-panel__card--active",
    state.isExpanded && "life-events-panel__card--expanded",
  ]
    .filter(Boolean)
    .join(" ");

  const headerClassName = [
    "life-events-event__card-header",
    state.isExpanded && "life-events-event__card-header--expanded",
  ]
    .filter(Boolean)
    .join(" ");

  const toggleExpanded = () => {
    onStateChange(state.id, { isExpanded: !state.isExpanded });
  };

  const renderEventLabel = () => {
    if (showTradeoff && mortgageExtras) {
      return (
        <>
          Pay{" "}
          <span className="life-events-event__amount-highlight">
            {config.formatHeaderAmount(headerAmount)}
          </span>
          {" off my mortgage in "}
          <span className="life-events-event__amount-highlight tabular-nums">
            {yearValue}
          </span>
        </>
      );
    }
    if (config.isRecurring) {
      return (
        <>
          {config.headerTitlePrefix}
          <span className="life-events-event__amount-highlight">
            {formatCurrency(headerAmount)}/mo
          </span>
          {config.headerTitleSuffix}
        </>
      );
    }
    return (
      <>
        {config.headerTitlePrefix}
        <span className="life-events-event__amount-highlight">
          {config.formatHeaderAmount(headerAmount)}
        </span>
        {config.headerTitleSuffix}
      </>
    );
  };

  const handleToggleActive = (checked: boolean) => {
    onStateChange(state.id, { isActive: checked });
    onActiveChange(state.id, checked, futureValue);
  };

  const amountValueId = `life-events-${state.id}-amount-value`;
  const amountRangeId = `life-events-${state.id}-amount-range`;
  const yearValueId = `life-events-${state.id}-year-value`;
  const yearRangeId = `life-events-${state.id}-year-range`;
  const durationValueId = `life-events-${state.id}-duration-value`;
  const durationRangeId = `life-events-${state.id}-duration-range`;
  const mortgageRateValueId = `life-events-${state.id}-mortgage-rate-value`;
  const monthlyPaymentValueId = `life-events-${state.id}-monthly-payment-value`;
  const loanTermSelectId = `life-events-${state.id}-loan-term`;
  const loanStartYearId = `life-events-${state.id}-loan-start-year`;

  const tradeoff =
    showTradeoff && mortgageDerived
      ? calcMortgageTradeoff(
          state.amount,
          mortgageRate,
          growthRate,
          yearValue,
          retirementYear,
          mortgageDerived.interestSavedAtPayoffYear,
        )
      : null;

  const breakEvenSentence =
    tradeoff != null
      ? formatMortgageBreakEvenSentence(
          calcMortgageBreakEvenRate(
            state.amount,
            tradeoff.interestSaved,
            yearValue,
            retirementYear,
          ),
          mortgageRate,
        )
      : null;

  const yearsRemaining = Math.max(0, retirementYear - yearValue);
  const scheduledPayoffYear =
    mortgagePayoffBounds?.scheduledPayoffYear ?? yearValue;
  const loanTermOptions = MORTGAGE_LOAN_TERM_YEARS.map((years) => ({
    id: String(years),
    label: `${years} years`,
  }));

  const collapsedSummary = formatCollapsedEventSummary(config, {
    year: yearValue,
    amount: state.amount,
    duration: durationValue,
    retirementYear,
    totalOutflow,
    mortgageInterestSaved: mortgageDerived?.interestSavedAtPayoffYear,
    hsaResult,
  });

  return (
    <div className={cardClassName}>
      <div className={headerClassName}>
        <div className="life-events-event__card-header-left">
          <label
            className={[
              "life-events-event__toggle",
              state.isActive && "life-events-event__toggle--on",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              className="life-events-event__toggle-input"
              checked={state.isActive}
              onChange={(e) => handleToggleActive(e.target.checked)}
              aria-label="Apply event to projection"
            />
            <span className="life-events-event__toggle-track" aria-hidden />
            <span className="life-events-event__toggle-thumb" aria-hidden />
          </label>
          <ImpactRatingBadge rating={rating} isOutflow />
        </div>
        <div className="life-events-event__card-header-right">
          <span
            className={[
              "life-events-event__card-header-impact",
              state.isActive
                ? "life-events-event__card-header-impact--active"
                : "life-events-event__card-header-impact--idle",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {futureValue > 0
              ? `−${formatCurrencyCompact(futureValue)}`
              : formatCurrency(0)}
          </span>
          <button
            type="button"
            className={[
              "life-events-event__chevron",
              state.isExpanded && "life-events-event__chevron--open",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={toggleExpanded}
            aria-expanded={state.isExpanded}
            aria-label={
              state.isExpanded
                ? "Collapse event details"
                : "Expand event details"
            }
          >
            <IconChevronDown size={16} stroke={1.5} aria-hidden />
          </button>
        </div>
      </div>

      <div className="life-events-event__card-body">
        <p className="life-events-event__label">
          {renderEventLabel()}
          {state.label?.includes("(") ? (
            <span className="life-events-event__label-suffix">
              {" "}
              ({state.label.split("(").pop()?.replace(")", "")})
            </span>
          ) : null}
        </p>
        {!state.isExpanded ? (
          <p className="life-events-event__sub-label">{collapsedSummary}</p>
        ) : null}
      </div>

      {state.isExpanded ? (
        <div className="life-events-event__detail-drawer">
          {config.isRecurring && totalOutflow != null && totalOutflow > 0 ? (
            <p className="life-events-event__impact-subline">
              {formatCurrency(state.amount)}/mo for {durationValue}{" "}
              {durationValue === 1 ? "year" : "years"} (
              {formatCurrency(totalOutflow)} total)
            </p>
          ) : null}

          <div className="life-events-event__expand">
            <div
              className={[
                "life-events-event__expand-layout",
                showTradeoff && "life-events-event__expand-layout--stacked",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div
                className={[
                  "life-events-slider-group",
                  showTradeoff && "life-events-slider-group--mortgage",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {showTradeoff && mortgageExtras ? (
                  <>
                    <div className="life-events-mortgage-fields">
                      <div className="life-events-mortgage-fields__row">
                        <CurrencyAmountInput
                          id={amountValueId}
                          label="Remaining"
                          value={state.amount}
                          onChange={(amount) =>
                            onStateChange(state.id, {
                              amount: clampNumber(
                                amount,
                                config.amountMin,
                                config.amountMax,
                              ),
                            })
                          }
                          className="life-events-mortgage-fields__field"
                        />
                        <LifeEventPercentInput
                          id={mortgageRateValueId}
                          label="Rate"
                          value={mortgageRate * 100}
                          min={mortgageExtras.mortgageRateMin}
                          max={mortgageExtras.mortgageRateMax}
                          onChange={(ratePct) =>
                            onStateChange(state.id, {
                              mortgageRate: ratePct / 100,
                            })
                          }
                          className="life-events-mortgage-fields__field"
                        />
                        <CurrencyAmountInput
                          id={monthlyPaymentValueId}
                          label="Monthly"
                          value={monthlyPayment}
                          onChange={(amount) =>
                            onStateChange(state.id, {
                              mortgageMonthlyPayment: clampNumber(
                                amount,
                                500,
                                5000,
                              ),
                            })
                          }
                          className="life-events-mortgage-fields__field"
                        />
                      </div>
                      <div className="life-events-mortgage-fields__row">
                        <div className="life-event-hero-field life-events-mortgage-fields__field">
                          <label
                            className="life-event-hero-field__label"
                            id={`${loanTermSelectId}-label`}
                            htmlFor={loanTermSelectId}
                          >
                            Loan term
                          </label>
                          <AppSelect
                            id={loanTermSelectId}
                            triggerId={loanTermSelectId}
                            ariaLabelledBy={`${loanTermSelectId}-label`}
                            value={String(loanTermYears)}
                            onChange={(id) =>
                              onStateChange(state.id, {
                                mortgageLoanTermYears:
                                  normalizeMortgageLoanTermYears(Number(id)),
                              })
                            }
                            options={loanTermOptions}
                            className="life-events-mortgage-fields__select app-select--compact"
                            layout="hero"
                          />
                        </div>
                        <LifeEventYearInput
                          id={loanStartYearId}
                          label="Year loan started"
                          value={loanStartYear}
                          min={2000}
                          max={currentYear}
                          onChange={(year) =>
                            onStateChange(state.id, {
                              mortgageLoanStartYear:
                                normalizeMortgageLoanStartYear(
                                  year,
                                  currentYear,
                                ),
                            })
                          }
                          className="life-events-mortgage-fields__field"
                        />
                      </div>
                    </div>

                    <MortgagePayoffSlider
                      id={yearRangeId}
                      min={yearMin}
                      max={yearMax}
                      value={yearValue}
                      scheduledPayoffYear={scheduledPayoffYear}
                      onChange={(year) => onStateChange(state.id, { year })}
                    />
                  </>
                ) : (
                  <>
                    <div className="life-events-field">
                      <div className="life-events-field__row">
                        <label
                          className="life-events-field__label"
                          htmlFor={amountValueId}
                        >
                          {config.amountLabel}
                        </label>
                        <LifeEventFieldValue
                          id={amountValueId}
                          value={state.amount}
                          min={config.amountMin}
                          max={config.amountMax}
                          prefix="$"
                          formatDisplay={fmtInput}
                          ariaLabel={config.amountLabel}
                          onCommit={(amount) =>
                            onStateChange(state.id, { amount })
                          }
                        />
                      </div>
                      <input
                        id={amountRangeId}
                        className="life-events-field__range"
                        type="range"
                        min={config.amountMin}
                        max={config.amountMax}
                        step={config.amountStep}
                        value={state.amount}
                        style={lifeEventRangeFillStyle(
                          state.amount,
                          config.amountMin,
                          config.amountMax,
                        )}
                        onChange={(e) =>
                          onStateChange(state.id, {
                            amount: Number(e.target.value),
                          })
                        }
                        aria-label={config.amountLabel}
                      />
                    </div>

                    <div className="life-events-field">
                      <div className="life-events-field__row">
                        <label
                          className="life-events-field__label"
                          htmlFor={yearValueId}
                        >
                          {config.yearLabel}
                        </label>
                        <LifeEventFieldValue
                          id={yearValueId}
                          value={yearValue}
                          min={yearMin}
                          max={yearMax}
                          formatDisplay={(year) => String(year)}
                          parseDisplay={(raw) =>
                            parseInt(raw.replace(/,/g, ""), 10) || 0
                          }
                          ariaLabel={config.yearLabel}
                          onCommit={(year) => onStateChange(state.id, { year })}
                        />
                      </div>
                      <input
                        id={yearRangeId}
                        className="life-events-field__range"
                        type="range"
                        min={yearMin}
                        max={yearMax}
                        step={1}
                        value={yearValue}
                        style={lifeEventRangeFillStyle(
                          yearValue,
                          yearMin,
                          yearMax,
                        )}
                        onChange={(e) =>
                          onStateChange(state.id, {
                            year: Number(e.target.value),
                          })
                        }
                        aria-label={config.yearLabel}
                      />
                    </div>

                    {config.isRecurring ? (
                      <div className="life-events-field">
                        <div className="life-events-field__row">
                          <label
                            className="life-events-field__label"
                            htmlFor={durationValueId}
                          >
                            {config.durationLabel ?? "For how many years?"}
                          </label>
                          <LifeEventFieldValue
                            id={durationValueId}
                            value={durationValue}
                            min={durationMin}
                            max={durationMax}
                            suffix={durationValue === 1 ? " yr" : " yrs"}
                            formatDisplay={(years) => String(years)}
                            parseDisplay={(raw) =>
                              parseInt(raw.replace(/,/g, ""), 10) || 0
                            }
                            ariaLabel={
                              config.durationLabel ?? "For how many years?"
                            }
                            onCommit={(duration) =>
                              onStateChange(state.id, { duration })
                            }
                          />
                        </div>
                        <input
                          id={durationRangeId}
                          className="life-events-field__range"
                          type="range"
                          min={durationMin}
                          max={durationMax}
                          step={config.durationStep ?? 1}
                          value={durationValue}
                          style={lifeEventRangeFillStyle(
                            durationValue,
                            durationMin,
                            durationMax,
                          )}
                          onChange={(e) =>
                            onStateChange(state.id, {
                              duration: Number(e.target.value),
                            })
                          }
                          aria-label={
                            config.durationLabel ?? "For how many years?"
                          }
                        />
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {showHsaAnalysis && hsaResult ? (
                <HsaAnalysisBlock
                  hsaResult={hsaResult}
                  hsaBalance={hsaBalance}
                  hsaSavings={hsaSavings}
                />
              ) : null}

              {showTradeoff && mortgageExtras && tradeoff ? (
                <>
                  <div className="life-events-tradeoff__header">
                    <span className="life-events-tradeoff__title">
                      You have two options
                    </span>
                  </div>

                  <div className="life-events-tradeoff__grid">
                    <div
                      className={[
                        "life-events-tradeoff__card",
                        !tradeoff.investingWins &&
                          "life-events-tradeoff__card--recommended",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="life-events-tradeoff__card-head">
                        <span className="life-events-tradeoff__card-title">
                          <span className="life-events-tradeoff__option-badge">
                            A
                          </span>
                          <span className="life-events-tradeoff__card-label">
                            Pay off early
                          </span>
                        </span>
                        {!tradeoff.investingWins ? (
                          <TradeoffRecommendedPill />
                        ) : null}
                      </div>
                      <div className="life-events-tradeoff__row">
                        <span className="life-events-tradeoff__row-label">
                          Portfolio cost
                        </span>
                        <span className="life-events-tradeoff__row-value life-events-tradeoff__row-value--negative">
                          {formatCurrency(
                            calcFutureValue(
                              state.amount,
                              yearValue,
                              retirementYear,
                              growthRate,
                            ),
                          )}
                        </span>
                      </div>
                      <div className="life-events-tradeoff__row">
                        <span className="life-events-tradeoff__row-label">
                          Monthly freed
                        </span>
                        <span className="life-events-tradeoff__row-value life-events-tradeoff__row-value--positive">
                          +${monthlyPayment.toLocaleString()}/mo
                        </span>
                      </div>
                      <div className="life-events-tradeoff__row">
                        <span className="life-events-tradeoff__row-label">
                          Interest saved
                        </span>
                        <span className="life-events-tradeoff__row-value">
                          {formatCurrency(tradeoff.interestSaved)}
                        </span>
                      </div>
                    </div>

                    <div
                      className={[
                        "life-events-tradeoff__card",
                        tradeoff.investingWins &&
                          "life-events-tradeoff__card--recommended",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="life-events-tradeoff__card-head">
                        <span className="life-events-tradeoff__card-title">
                          <span className="life-events-tradeoff__option-badge">
                            B
                          </span>
                          <span className="life-events-tradeoff__card-label">
                            Stay invested
                          </span>
                        </span>
                        {tradeoff.investingWins ? (
                          <TradeoffRecommendedPill />
                        ) : null}
                      </div>
                      <div className="life-events-tradeoff__row">
                        <span className="life-events-tradeoff__row-label">
                          Portfolio gain
                        </span>
                        <span className="life-events-tradeoff__row-value life-events-tradeoff__row-value--positive">
                          {formatCurrency(tradeoff.investmentGain)}
                        </span>
                      </div>
                      <div className="life-events-tradeoff__row">
                        <span className="life-events-tradeoff__row-label">
                          Mortgage continues
                        </span>
                        <span className="life-events-tradeoff__row-value life-events-tradeoff__row-value--negative">
                          -${monthlyPayment.toLocaleString()}/mo
                        </span>
                      </div>
                      <div className="life-events-tradeoff__row">
                        <span className="life-events-tradeoff__row-label">
                          Net advantage
                        </span>
                        <span className="life-events-tradeoff__row-value">
                          {formatCurrency(
                            Math.abs(tradeoff.netAdvantageOfInvesting),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="life-events-tradeoff__verdict">
                    {enrichTradeoffVerdict(
                      mortgageExtras.tradeoffNarrative(
                        state.amount,
                        yearValue,
                        futureValue,
                        retirementYear,
                        mortgageRate,
                        growthRate,
                        monthlyPayment,
                        yearsRemaining,
                        tradeoff.netAdvantageOfInvesting,
                        tradeoff.investingWins,
                      ),
                    )}
                    {breakEvenSentence ? (
                      <> {enrichTradeoffVerdict(breakEvenSentence)}</>
                    ) : null}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
