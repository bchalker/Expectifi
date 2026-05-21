import type { CSSProperties, KeyboardEvent } from "react";
import { IconAlertTriangle, IconPlane } from "@tabler/icons-react";
import type { ScoredMapCity } from "../../lib/whereToRetire/cityMapScoring";
import {
  countryToFlagEmoji,
  hasTravelAdvisory,
} from "../../utils/costOfLiving";
import { formatEastCoastFlightHint } from "../../utils/gettingThere";
import { WtrAffordabilityScoreBar } from "./WtrAffordabilityScoreBar";
import "./RetirementDestinationCard.scss";

type Props = {
  scored: ScoredMapCity;
  rank: number;
  active: boolean;
  staggerIndex?: number;
  onSelect: () => void;
};

export function RetirementDestinationCard({
  scored,
  rank,
  active,
  staggerIndex,
  onSelect,
}: Props) {
  const { city, affordabilityScore, tier } = scored;
  const showAdvisory = hasTravelAdvisory(city.country);
  const flightHint = formatEastCoastFlightHint(city.country);

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
        `wtr-dest-card--${tier}`,
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
          <span className="wtr-dest-card__rank" aria-hidden>
            {rank}
          </span>
          <span className="wtr-dest-card__rank-sep" aria-hidden />
        </div>
        <span className="wtr-dest-card__body">
          <span className="wtr-dest-card__name-row">
            <span className="wtr-dest-card__name">{city.city}</span>
            {showAdvisory ? (
              <span className="wtr-dest-card__advisory-badge">
                <IconAlertTriangle size={14} stroke={1.5} aria-hidden />
                Travel advisory
              </span>
            ) : null}
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
          <WtrAffordabilityScoreBar
            score={affordabilityScore}
            tier={tier}
            className="wtr-dest-card__score"
          />
        </span>
      </div>
    </div>
  );
}
