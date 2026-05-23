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
  hasTravelAdvisory,
} from "../../utils/costOfLiving";
import { formatEastCoastFlightHint } from "../../utils/gettingThere";
import {
  formatEstimatedAmericans,
  getExpatDestinationInfo,
  isDomesticRetirementDestination,
} from "../../utils/expatInfo";
import type { MapIncomeFitDisplay } from "../../lib/whereToRetire/mapIncomeFit";
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
          <span className="wtr-dest-card__name-row">
            <span className="wtr-dest-card__name">{city.city}</span>
            <span className="wtr-dest-card__name-actions">
              {showAdvisory ? (
                <span className="wtr-dest-card__advisory-badge">
                  <IconAlertTriangle size={14} stroke={1.5} aria-hidden />
                  Travel advisory
                </span>
              ) : null}
            </span>
          </span>
          <span className="wtr-dest-card__country">
            <span className="wtr-dest-card__flag" aria-hidden>
              {countryToFlagEmoji(city.country)}
            </span>
            <span className="wtr-dest-card__country-name">{city.country}</span>
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
          ) : (
            <WtrAffordabilityScoreBar
              score={badgeScore}
              band={
                pinColorView === "score"
                  ? scored.band
                  : (bandClass as BudgetFitBand)
              }
              bandColor={pinColor}
              valueSuffix={pinColorView === "budget" ? "%" : undefined}
              className="wtr-dest-card__score"
            />
          )}
          {incomeFit ? <WtrIncomeFitBadges fit={incomeFit} variant="list" /> : null}
        </span>
      </div>
    </div>
  );
}
