import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./LandingHeroHeadline.scss";

const HERO_LOCATIONS = [
  "Portugal",
  "Costa Rica",
  "Thailand",
  "Texas",
  "Florida",
  "Mexico",
  "Italy",
  "Panama",
  "Spain",
] as const;

const DISPLAY_MS = 2500;
const TRANSITION_MS = 400;

type AnimPhase = "steady" | "out" | "in";

export function LandingHeroHeadline() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<AnimPhase>("steady");
  const [slotWidth, setSlotWidth] = useState<number | null>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (phase === "steady") {
      timer = setTimeout(() => setPhase("out"), DISPLAY_MS);
    } else if (phase === "out") {
      timer = setTimeout(() => {
        setIndex((i) => (i + 1) % HERO_LOCATIONS.length);
        setPhase("in");
      }, TRANSITION_MS);
    } else {
      timer = setTimeout(() => setPhase("steady"), TRANSITION_MS);
    }

    return () => clearTimeout(timer);
  }, [phase]);

  const location = HERO_LOCATIONS[index];

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    setSlotWidth(el.offsetWidth);
  }, [location]);

  return (
    <div className="landing-hero-headline">
      <h1 id="landing-hero-title" className="landing-hero-headline__title">
        <span className="landing-hero-headline__title-line">
          Could you retire in{" "}
          <span
            className="landing-hero-headline__location-slot"
            style={slotWidth !== null ? { width: slotWidth } : undefined}
          >
            <span
              ref={measureRef}
              className="landing-hero-headline__location-measure"
              aria-hidden="true"
            >
              {location}
            </span>
            <span className="landing-hero-headline__location-viewport">
              <span
                className={[
                  "landing-hero-headline__location",
                  phase === "out" && "landing-hero-headline__location--out",
                  phase === "in" && "landing-hero-headline__location--in",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-live="polite"
              >
                {location}
              </span>
            </span>
          </span>
        </span>
        <span className="landing-hero-headline__title-line">
          on your expected savings?
        </span>
      </h1>
      <p className="landing-hero-headline__tagline">
        Test it against different markets, then see where your savings stretch
        furthest.
      </p>
    </div>
  );
}
