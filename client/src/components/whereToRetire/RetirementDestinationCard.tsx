import type { CSSProperties, KeyboardEvent } from "react";
import {
  IconAlertTriangle,
  IconCheck,
  IconHeart,
  IconHeartFilled,
} from "@tabler/icons-react";
import type { ScoredMapCity } from "../../lib/whereToRetire/cityMapScoring";
import {
  resolveMapPinDisplay,
  type MapPinColorView,
} from "../../lib/whereToRetire/mapPinDisplay";
import {
  formatUsd,
  hasTravelAdvisory,
} from "../../utils/costOfLiving";
import { hasReconsiderTravelAdvisory } from "../../lib/travelAdvisories";
import { WtrTravelAdvisoryCautionChip } from "./WtrTravelAdvisoryCautionChip";
import { getFitScoreColors } from "../../utils/fitScore";
import { CountryFlag } from "../ui/CountryFlag";
import {
  formatEstimatedAmericans,
  getExpatDestinationInfo,
  isDomesticRetirementDestination,
} from "../../utils/expatInfo";
import type { MapIncomeFitDisplay } from "../../lib/whereToRetire/mapIncomeFit";
import { monthlyOutflowForMapCity } from "../../lib/whereToRetire/mapIncomeFit";
import type { MapFilters } from "../../lib/whereToRetire/cityMapScoring";
import "./RetirementDestinationCard.scss";
import "./WtrMapPinLegend.scss";

type Props = {
  scored: ScoredMapCity;
  monthlyIncome: number;
  pinColorView: MapPinColorView;
  rank: number;
  active: boolean;
  staggerIndex?: number;
  incomeFit?: MapIncomeFitDisplay | null;
  mapFilters?: Pick<MapFilters, "lifestyle">;
  onSelect: () => void;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
};

export function RetirementDestinationCard({
  scored,
  monthlyIncome,
  pinColorView,
  rank,
  active,
  staggerIndex,
  incomeFit = null,
  mapFilters,
  onSelect,
  isFavorited = false,
  onToggleFavorite,
}: Props) {
  const { city } = scored;
  const display = resolveMapPinDisplay(scored, pinColorView, monthlyIncome);
  const { displayScore: badgeScore, bandClass, pinColor, bandLabel } = display;
  const fitBadgeColors = getFitScoreColors(badgeScore);
  const showAdvisory = hasTravelAdvisory(city.country);
  const showCaution = hasReconsiderTravelAdvisory(city.country);
  const expatInfo =
    pinColorView === "expat" ? getExpatDestinationInfo(city.country) : null;
  const americansNote =
    pinColorView === "expat" &&
    expatInfo &&
    !isDomesticRetirementDestination(city.country)
      ? formatEstimatedAmericans(expatInfo.estimated_americans)
      : null;

  const monthlyCost = mapFilters
    ? monthlyOutflowForMapCity(scored, monthlyIncome, mapFilters)
    : scored.monthlyBudget;
  const monthlySurplus =
    monthlyCost != null ? Math.max(0, monthlyIncome - monthlyCost) : null;
  const showMonthlyStat =
    (pinColorView === "budget" || pinColorView === "score") &&
    monthlyCost != null &&
    Number.isFinite(monthlyCost);

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={[
        "wtr-dest-card",
        active && "wtr-dest-card--active",
        `wtr-dest-card--${bandClass}`,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        staggerIndex != null
          ? ({ "--wtr-card-i": staggerIndex } as CSSProperties)
          : undefined
      }
      onClick={onSelect}
      onKeyDown={handleCardKeyDown}
      aria-pressed={active}
    >
      <div className="wtr-dest-card__top">
        <div className="wtr-dest-card__rank-col">
          <div className="wtr-dest-card__rank-stack">
            <span className="wtr-dest-card__rank" aria-hidden>
              {rank}
            </span>
            {onToggleFavorite ? (
              <button
                type="button"
                className={[
                  "wtr-dest-card__favorite-btn",
                  isFavorited && "wtr-dest-card__favorite-btn--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={
                  isFavorited
                    ? `Remove ${city.city} from favorites`
                    : `Save ${city.city} to favorites`
                }
                aria-pressed={isFavorited}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
              >
                {isFavorited ? (
                  <IconHeartFilled size={16} stroke={1.5} aria-hidden />
                ) : (
                  <IconHeart size={16} stroke={1.5} aria-hidden />
                )}
              </button>
            ) : null}
          </div>
          <span className="wtr-dest-card__rank-sep" aria-hidden />
        </div>

        <div className="wtr-dest-card__body">
          <div className="wtr-dest-card__head-row">
            <div className="wtr-dest-card__identity">
              <span className="wtr-dest-card__name">{city.city}</span>
              <span className="wtr-dest-card__country">
                <CountryFlag country={city.country} size="s" className="wtr-dest-card__flag" />
                <span className="wtr-dest-card__country-name">{city.country}</span>
              </span>
            </div>

            {showMonthlyStat ? (
              <span className="wtr-dest-card__budget-stat">
                <span className="wtr-dest-card__budget-amount tabular-nums">
                  {formatUsd(monthlyCost)}
                  <span className="wtr-dest-card__budget-suffix">/mo</span>
                </span>
                {pinColorView === "budget" &&
                monthlySurplus != null &&
                monthlySurplus > 0 ? (
                  <span className="wtr-dest-card__budget-surplus tabular-nums">
                    + {formatUsd(monthlySurplus)}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>

          {pinColorView === "expat" ? (
            <span className="wtr-dest-card__expat-badge-row">
              <span className="wtr-map-pin-legend__item">
                <span
                  className="wtr-map-pin-legend__dot"
                  style={{ background: pinColor }}
                  aria-hidden
                />
                <span className="wtr-map-pin-legend__label">{bandLabel}</span>
              </span>
              {americansNote ? (
                <span className="wtr-dest-card__expat-count">{americansNote}</span>
              ) : null}
            </span>
          ) : null}

          {incomeFit ? (
            <div className="wtr-dest-card__meta font-xs">
              <span className="wtr-dest-card__meta-visa">
                {incomeFit.visaQualifies ? (
                  <IconCheck
                    className="wtr-dest-card__meta-visa-icon"
                    size={14}
                    stroke={2}
                    aria-hidden
                  />
                ) : null}
                {incomeFit.visaLabel}
              </span>
              <span className="wtr-dest-card__meta-tax">{incomeFit.taxLabel}</span>
              {showCaution ? (
                <WtrTravelAdvisoryCautionChip country={city.country} />
              ) : null}
            </div>
          ) : showCaution ? (
            <div className="wtr-dest-card__meta font-xs">
              <WtrTravelAdvisoryCautionChip country={city.country} />
            </div>
          ) : null}

          {showAdvisory ? (
            <span className="wtr-dest-card__advisory-footer">
              <IconAlertTriangle size={14} stroke={1.5} aria-hidden />
              Travel advisory
            </span>
          ) : null}
        </div>

        {pinColorView === "score" ? (
          <div
            className="wtr-dest-card__fit-col"
            style={
              {
                "--wtr-fit-col-bg": fitBadgeColors.background,
                "--wtr-fit-score-color": fitBadgeColors.text,
              } as CSSProperties
            }
          >
            <span className="wtr-dest-card__fit-sep" aria-hidden />
            <div className="wtr-dest-card__fit-stack">
              <span
                className="wtr-dest-card__fit-badge tabular-nums"
                aria-label={`Fit score ${badgeScore} out of 100`}
              >
                {badgeScore}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
