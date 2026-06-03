import type { CSSProperties, KeyboardEvent } from "react";
import { IconAlertTriangle, IconHeart, IconHeartFilled, IconPlane } from "@tabler/icons-react";
import type { ScoredMapCity } from "../../lib/whereToRetire/cityMapScoring";
import {
  resolveMapPinDisplay,
  type BudgetFitBand,
  type MapPinColorView,
} from "../../lib/whereToRetire/mapPinDisplay";
import {
  countryToFlagEmoji,
  formatUsd,
  hasTravelAdvisory,
} from "../../utils/costOfLiving";
import { formatEastCoastFlightHint } from "../../utils/gettingThere";
import {
  formatEstimatedAmericans,
  getExpatDestinationInfo,
  isDomesticRetirementDestination,
} from "../../utils/expatInfo";
import type { MapIncomeFitDisplay } from "../../lib/whereToRetire/mapIncomeFit";
import { monthlyOutflowForMapCity } from "../../lib/whereToRetire/mapIncomeFit";
import type { MapFilters } from "../../lib/whereToRetire/cityMapScoring";
import { WtrAffordabilityScoreBar } from "./WtrAffordabilityScoreBar";
import { WtrIncomeFitBadges } from "./WtrIncomeFitBadges";
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
  mapFilters?: Pick<MapFilters, "includeHealthIns" | "healthInsMonthlyUsd">;
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
  const showAdvisory = hasTravelAdvisory(city.country);
  const flightHint = formatEastCoastFlightHint(city.country);
  const expatInfo =
    pinColorView === "expat" ? getExpatDestinationInfo(city.country) : null;
  const americansNote =
    pinColorView === "expat" &&
    expatInfo &&
    !isDomesticRetirementDestination(city.country)
      ? formatEstimatedAmericans(expatInfo.estimated_americans)
      : null;

  const monthlyCost =
    pinColorView === "budget" && mapFilters
      ? monthlyOutflowForMapCity(scored, monthlyIncome, mapFilters)
      : null;
  const monthlySurplus =
    monthlyCost != null ? Math.max(0, monthlyIncome - monthlyCost) : null;

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
        <span className="wtr-dest-card__body">
          {incomeFit ? (
            <WtrIncomeFitBadges fit={incomeFit} variant="list" part="tax" />
          ) : null}
          <span className="wtr-dest-card__head-row">
            <span className="wtr-dest-card__identity">
              <span className="wtr-dest-card__name-row">
                <span className="wtr-dest-card__name">{city.city}</span>
              </span>
              <span className="wtr-dest-card__country">
                <span className="wtr-dest-card__flag" aria-hidden>
                  {countryToFlagEmoji(city.country)}
                </span>
                <span className="wtr-dest-card__country-name">{city.country}</span>
                {incomeFit ? (
                  <WtrIncomeFitBadges fit={incomeFit} variant="list" part="visa" />
                ) : null}
              </span>
            </span>
            {pinColorView === "budget" && monthlyCost != null ? (
              <span className="wtr-dest-card__budget-stat">
                <span className="wtr-dest-card__budget-amount tabular-nums">
                  {formatUsd(monthlyCost)}
                </span>
                {monthlySurplus != null && monthlySurplus > 0 ? (
                  <span className="wtr-dest-card__budget-surplus tabular-nums">
                    + {formatUsd(monthlySurplus)}
                  </span>
                ) : null}
              </span>
            ) : null}
          </span>
          {flightHint ? (
            <span className="wtr-dest-card__flight-hint">
              <IconPlane
                className="wtr-dest-card__flight-icon"
                size={14}
                stroke={1.5}
                aria-hidden
              />
              {flightHint}
            </span>
          ) : null}
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
          ) : pinColorView === "budget" ? null : (
            <WtrAffordabilityScoreBar
              score={badgeScore}
              band={
                pinColorView === "score"
                  ? scored.band
                  : (bandClass as BudgetFitBand)
              }
              bandColor={pinColor}
              className="wtr-dest-card__score"
            />
          )}
          {showAdvisory ? (
            <span className="wtr-dest-card__advisory-footer">
              <IconAlertTriangle size={14} stroke={1.5} aria-hidden />
              Travel advisory
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
