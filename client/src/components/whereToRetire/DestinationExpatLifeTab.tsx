import { useMemo, type CSSProperties } from "react";
import { IconAlertCircle, IconExternalLinkFilled } from "@tabler/icons-react";
import { DetailPanelCard } from "../ui/DetailPanelCard";
import { NarrativeWhyLine } from "../ui/NarrativeWhyLine";
import { PanelHeadsUpCallout } from "../ui/PanelHeadsUpCallout";
import {
  expatCommunitySizeTone,
  expatUnavailableMessage,
  facebookGroupSearchUrl,
  formatEstimatedAmericans,
  forumLinkHref,
  getExpatDestinationInfo,
  getExpatPanelHeadsUp,
  isDomesticRetirementDestination,
} from "../../utils/expatInfo";
import "./DestinationExpatLifeTab.scss";

const INTERNATIONS_URL = "https://www.internations.org/";

type Props = {
  city: string;
  country: string;
  staggerClassName?: string;
  staggerStyle?: (index: number) => CSSProperties;
};

function staggerSectionProps(
  index: number,
  baseClass: string | undefined,
  staggerClassName: string | undefined,
  staggerStyle: ((index: number) => CSSProperties) | undefined,
): { className?: string; style?: CSSProperties } {
  if (!staggerClassName || !staggerStyle) {
    return baseClass ? { className: baseClass } : {};
  }
  return {
    className: baseClass
      ? `${baseClass} ${staggerClassName}`
      : staggerClassName,
    style: staggerStyle(index),
  };
}

export function DestinationExpatLifeTab({
  city,
  country,
  staggerClassName,
  staggerStyle,
}: Props) {
  const data = useMemo(() => getExpatDestinationInfo(country), [country]);
  const panelHeadsUp = useMemo(() => getExpatPanelHeadsUp(data), [data]);

  if (isDomesticRetirementDestination(country)) {
    return (
      <p
        {...staggerSectionProps(
          0,
          "wtr-expat-life__empty",
          staggerClassName,
          staggerStyle,
        )}
      >
        {city} is a domestic US retirement destination. Expat community data
        applies to international relocations — use Best overall fit or Lowest
        cost views to compare US cities.
      </p>
    );
  }

  if (!data) {
    return (
      <p
        {...staggerSectionProps(
          0,
          "wtr-expat-life__empty",
          staggerClassName,
          staggerStyle,
        )}
      >
        {expatUnavailableMessage(city)}
      </p>
    );
  }

  const tone = expatCommunitySizeTone(data.community_size);
  const americansNote = formatEstimatedAmericans(data.estimated_americans);

  let sectionIndex = 0;

  return (
    <div className="wtr-expat-life">
      <DetailPanelCard
        className="wtr-expat-life__group"
        {...staggerSectionProps(
          sectionIndex++,
          "wtr-expat-life__group",
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3 className="wtr-city-detail__section-title wtr-expat-life__section-title">
          Community
        </h3>
        <div className="wtr-expat-life__community-row">
          <span
            className={`wtr-expat-life__size-badge wtr-expat-life__size-badge--${tone}`}
          >
            {data.community_size}
          </span>
          {americansNote ? (
            <span className="wtr-expat-life__americans">{americansNote}</span>
          ) : null}
        </div>
        <NarrativeWhyLine>{data.community_why}</NarrativeWhyLine>
      </DetailPanelCard>

      {data.popular_areas.length > 0 ? (
        <DetailPanelCard
          className="wtr-expat-life__group"
          {...staggerSectionProps(
            sectionIndex++,
            "wtr-expat-life__group",
            staggerClassName,
            staggerStyle,
          )}
        >
          <h3 className="wtr-city-detail__section-title wtr-expat-life__section-title">
            Popular expat areas
          </h3>
          <ul className="wtr-expat-life__area-list">
            {data.popular_areas.map((area) => (
              <li key={area} className="wtr-expat-life__area-item">
                {area}
              </li>
            ))}
          </ul>
        </DetailPanelCard>
      ) : null}

      <DetailPanelCard
        className="wtr-expat-life__group"
        {...staggerSectionProps(
          sectionIndex++,
          "wtr-expat-life__group",
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3 className="wtr-city-detail__section-title wtr-expat-life__section-title">
          What expats say
        </h3>
        <blockquote className="wtr-expat-life__vibe">{data.expat_vibe}</blockquote>
        <NarrativeWhyLine className="wtr-expat-life__why">{data.expat_vibe_why}</NarrativeWhyLine>
      </DetailPanelCard>

      <DetailPanelCard
        className="wtr-expat-life__group"
        {...staggerSectionProps(
          sectionIndex++,
          "wtr-expat-life__group",
          staggerClassName,
          staggerStyle,
        )}
      >
        <dl className="wtr-expat-life__rows">
          <div className="wtr-expat-life__row">
            <dt>Day-to-day language</dt>
            <dd>{data.language_barrier}</dd>
            <NarrativeWhyLine className="wtr-expat-life__why">
              {data.language_barrier_why}
            </NarrativeWhyLine>
          </div>
          <div className="wtr-expat-life__row">
            <dt>Healthcare for expats</dt>
            <dd>{data.healthcare_expat}</dd>
            <NarrativeWhyLine className="wtr-expat-life__why">
              {data.healthcare_expat_why}
            </NarrativeWhyLine>
          </div>
        </dl>
      </DetailPanelCard>

      <DetailPanelCard
        className="wtr-expat-life__group"
        {...staggerSectionProps(
          sectionIndex++,
          "wtr-expat-life__group",
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3 className="wtr-city-detail__section-title wtr-expat-life__section-title">
          Cost reality check
        </h3>
        <div className="wtr-expat-life__cost-callout" role="note">
          <IconAlertCircle
            size={18}
            stroke={1.5}
            className="wtr-expat-life__cost-icon"
            aria-hidden
          />
          <p>{data.cost_note}</p>
        </div>
        <NarrativeWhyLine className="wtr-expat-life__why">{data.cost_note_why}</NarrativeWhyLine>
      </DetailPanelCard>

      <section
        className="wtr-expat-life__group"
        {...staggerSectionProps(
          sectionIndex++,
          "wtr-expat-life__group",
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3 className="wtr-city-detail__section-title wtr-expat-life__section-title">
          Connect with the community
        </h3>
        <ul className="wtr-expat-life__fb-list">
          {data.facebook_groups.map((group) => (
            <li key={group}>
              <a
                href={facebookGroupSearchUrl(group)}
                target="_blank"
                rel="noopener noreferrer"
                className="wtr-expat-life__fb-link"
              >
                {group} on Facebook
                <IconExternalLinkFilled size={14} stroke={1.5} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
        {data.forums.length > 0 ? (
          <ul className="wtr-expat-life__forum-list">
            {data.forums.map((forum) => (
              <li key={forum}>
                <a
                  href={forumLinkHref(forum)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wtr-expat-life__forum-link"
                >
                  {forum}
                  <IconExternalLinkFilled size={14} stroke={1.5} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {data.internations_chapter ? (
          <a
            href={INTERNATIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="wtr-expat-life__internations-badge"
          >
            InterNations chapter active
            <IconExternalLinkFilled size={14} stroke={1.5} aria-hidden />
          </a>
        ) : null}
      </section>

      <PanelHeadsUpCallout
        className="wtr-expat-life__heads-up"
        {...staggerSectionProps(
          sectionIndex++,
          undefined,
          staggerClassName,
          staggerStyle,
        )}
      >
        {panelHeadsUp}
      </PanelHeadsUpCallout>
    </div>
  );
}
