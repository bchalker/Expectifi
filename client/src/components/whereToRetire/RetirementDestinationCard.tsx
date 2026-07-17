import type { CSSProperties, KeyboardEvent } from "react";
import {
  IconAlertTriangle,
  IconArrowNarrowRightDashed,
  IconCheck,
  IconHeart,
  IconHeartFilled,
  IconZoomIn,
} from "@tabler/icons-react";
import type { MapFilters, ScoredMapCity } from "../../lib/whereToRetire/cityMapScoring";
import {
  mapIncomeFitDisplayForCity,
  monthlyOutflowForMapCity,
} from "../../lib/whereToRetire/mapIncomeFit";
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
import "./RetirementDestinationCard.scss";
import "./WtrMapPinLegend.scss";

type CommonProps = {
  scored: ScoredMapCity;
  monthlyIncome: number;
  modeledAge?: number;
  pinColorView: MapPinColorView;
  mapFilters: Pick<MapFilters, "lifestyle">;
  /** Favorite pin band override — map tooltips only today. */
  isFavoritePin?: boolean;
};

type ListVariantProps = CommonProps & {
  variant?: "list";
  rank: number;
  active?: boolean;
  staggerIndex?: number;
  onSelect: () => void;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
};

type TooltipVariantProps = CommonProps & {
  variant: "tooltip";
};

export type RetirementDestinationCardProps =
  | ListVariantProps
  | TooltipVariantProps;

export function RetirementDestinationCard(props: RetirementDestinationCardProps) {
  const {
    scored,
    monthlyIncome,
    modeledAge,
    pinColorView,
    mapFilters,
    isFavoritePin = false,
  } = props;
  const isList = props.variant !== "tooltip";
  const isTooltip = props.variant === "tooltip";

  const { city } = scored;
  const display = resolveMapPinDisplay(
    scored,
    pinColorView,
    monthlyIncome,
    isFavoritePin,
  );
  const { bandClass, pinColor, bandLabel } = display;
  const fitScore = scored.displayScore;
  const fitScoreColors = getFitScoreColors(fitScore);
  const showAdvisory = hasTravelAdvisory(city.country);
  const showCaution = hasReconsiderTravelAdvisory(city.country);
  const incomeFit = mapIncomeFitDisplayForCity(
    city.city,
    city.country,
    monthlyIncome,
    mapFilters,
    modeledAge,
  );

  const expatInfo =
    pinColorView === "expat" ? getExpatDestinationInfo(city.country) : null;
  const americansNote =
    pinColorView === "expat" &&
    expatInfo &&
    !isDomesticRetirementDestination(city.country)
      ? formatEstimatedAmericans(expatInfo.estimated_americans)
      : null;

  const monthlyCost = monthlyOutflowForMapCity(
    scored,
    monthlyIncome,
    mapFilters,
  );
  const monthlySurplus =
    monthlyCost != null ? Math.max(0, monthlyIncome - monthlyCost) : null;
  const showMonthlyStat =
    (pinColorView === "budget" || pinColorView === "score") &&
    monthlyCost != null &&
    Number.isFinite(monthlyCost);

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isList) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      props.onSelect();
    }
  };

  const expatBadgeRow =
    pinColorView === "expat" ? (
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
    ) : null;

  const metaRow = incomeFit ? (
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
      <span
        className={[
          "wtr-dest-card__meta-tax",
          isList && `wtr-dest-card__meta-tax--${incomeFit.taxTone}`,
        ]
          .filter(Boolean)
          .join(" ")}
        title={incomeFit.taxTooltip}
      >
        {isList ? <span className="wtr-dest-card__meta-tax-dot" aria-hidden /> : null}
        {incomeFit.taxLabel}
      </span>
    </div>
  ) : null;

  return (
    <div
      role={isList ? "button" : undefined}
      tabIndex={isList ? 0 : undefined}
      data-city-id={isList ? city.id : undefined}
      className={[
        "wtr-dest-card",
        isTooltip && "wtr-dest-card--tooltip",
        isList && props.active && "wtr-dest-card--active",
        `wtr-dest-card--${bandClass}`,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        isList && props.staggerIndex != null
          ? ({ "--wtr-card-i": props.staggerIndex } as CSSProperties)
          : undefined
      }
      onClick={isList ? props.onSelect : undefined}
      onKeyDown={isList ? handleCardKeyDown : undefined}
      aria-pressed={isList ? props.active : undefined}
    >
      <div className="wtr-dest-card__top">
        {isList ? (
          <div className="wtr-dest-card__rank-col">
            <div className="wtr-dest-card__rank-stack">
              <span className="wtr-dest-card__rank" aria-hidden>
                {props.rank}
              </span>
              {props.onToggleFavorite ? (
                <button
                  type="button"
                  className={[
                    "wtr-dest-card__favorite-btn",
                    props.isFavorited &&
                      "wtr-dest-card__favorite-btn--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={
                    props.isFavorited
                      ? `Remove ${city.city} from favorites`
                      : `Save ${city.city} to favorites`
                  }
                  aria-pressed={props.isFavorited}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onToggleFavorite?.();
                  }}
                >
                  {props.isFavorited ? (
                    <IconHeartFilled size={16} stroke={1.5} aria-hidden />
                  ) : (
                    <IconHeart size={16} stroke={1.5} aria-hidden />
                  )}
                </button>
              ) : null}
            </div>
            <span className="wtr-dest-card__rank-sep" aria-hidden />
          </div>
        ) : null}

        <div className="wtr-dest-card__body">
          <div className="wtr-dest-card__head-row">
            <div className="wtr-dest-card__identity">
              <span className="wtr-dest-card__name">{city.city}</span>
            </div>

            {showMonthlyStat ? (
              <span className="wtr-dest-card__budget-stat">
                <span className="wtr-dest-card__budget-amount tabular-nums">
                  {formatUsd(monthlyCost)}
                  <span className="wtr-dest-card__budget-suffix">/mo</span>
                </span>
                {isTooltip &&
                pinColorView === "budget" &&
                monthlySurplus != null &&
                monthlySurplus > 0 ? (
                  <span className="wtr-dest-card__budget-surplus tabular-nums">
                    + {formatUsd(monthlySurplus)}
                  </span>
                ) : null}
              </span>
            ) : null}

            <span className="wtr-dest-card__country">
              <CountryFlag
                country={city.country}
                size="s"
                className="wtr-dest-card__flag"
              />
              <span className="wtr-dest-card__country-line">
                <span className="wtr-dest-card__country-name">
                  {city.country}
                </span>
                {showCaution ? (
                  <>
                    <span
                      className="wtr-dest-card__country-divider"
                      aria-hidden
                    >
                      ·
                    </span>
                    <WtrTravelAdvisoryCautionChip
                      country={city.country}
                      variant="inline"
                    />
                  </>
                ) : null}
              </span>
            </span>
          </div>

          {isList ? (
            <>
              {metaRow}
              {expatBadgeRow}
            </>
          ) : (
            <>
              {expatBadgeRow}
              {metaRow}
            </>
          )}

          {showAdvisory ? (
            <span className="wtr-dest-card__advisory-footer">
              <IconAlertTriangle size={14} stroke={1.5} aria-hidden />
              Travel advisory
            </span>
          ) : null}
        </div>

        <div className="wtr-dest-card__fit-col">
          <div
            className="wtr-dest-card__fit-stack"
            style={
              {
                "--wtr-fit-col-bg": fitScoreColors.background,
                "--wtr-fit-score-color": fitScoreColors.text,
              } as CSSProperties
            }
          >
            <span
              className="wtr-dest-card__fit-badge tabular-nums"
              aria-label={`Fit score ${fitScore} out of 100`}
            >
              {fitScore}
            </span>
            {isList ? (
              <span className="wtr-dest-card__fit-zoom" aria-hidden>
                <span className="wtr-dest-card__fit-zoom-icons">
                  <span className="wtr-dest-card__fit-zoom-search">
                    <IconZoomIn size={14} stroke={2} />
                  </span>
                  <span className="wtr-dest-card__fit-go">
                    <IconArrowNarrowRightDashed size={14} stroke={1.5} />
                  </span>
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
