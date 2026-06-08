import "../LifeEventsPanel.scss";

type Props = {
  className?: string;
};

const LIFE_EVENTS_SECTION_DIVIDER_D =
  "M0 20 C150 5, 300 35, 450 20 C600 5, 750 35, 900 20 C1050 5, 1150 30, 1200 20";

export function LifeEventsSectionDivider({ className }: Props) {
  return (
    <div
      className={["life-events-section-divider", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      <svg
        className="life-events-section-divider__svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
      >
        <path
          className="life-events-section-divider__path"
          d={LIFE_EVENTS_SECTION_DIVIDER_D}
        />
      </svg>
    </div>
  );
}
