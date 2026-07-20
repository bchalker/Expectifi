import { useState } from "react";
import "./LandingHeroLandmarks.scss";

const LANDMARKS = [
  { id: "arc-de-triomphe", src: "/images/landmarks/arc-de-triomphe.svg" },
  { id: "colosseum", src: "/images/landmarks/colosseum.svg" },
  { id: "christ-redeemer", src: "/images/landmarks/christ-redeemer.svg" },
  { id: "pisa", src: "/images/landmarks/pisa.svg" },
  { id: "big-ben", src: "/images/landmarks/big-ben.svg" },
  { id: "sydney-opera", src: "/images/landmarks/sydney-opera.svg" },
  { id: "eiffel-tower", src: "/images/landmarks/eiffel-tower.svg" },
  { id: "statue-of-liberty", src: "/images/landmarks/statue-of-liberty.svg" },
] as const;

type Landmark = (typeof LANDMARKS)[number];

function pickDistinctPair(): [Landmark, Landmark] {
  const left = LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)]!;
  const rightPool = LANDMARKS.filter((l) => l.id !== left.id);
  const right = rightPool[Math.floor(Math.random() * rightPool.length)]!;
  return [left, right];
}

/** Decorative landmarks — random left/right pair, stable until page refresh. */
export function LandingHeroLandmarks() {
  const [[left, right]] = useState(pickDistinctPair);

  return (
    <div className="landing-hero-landmarks" aria-hidden>
      <img
        className="landing-hero-landmarks__img landing-hero-landmarks__img--left"
        src={left.src}
        alt=""
        width={320}
        height={320}
        decoding="async"
      />
      <img
        className="landing-hero-landmarks__img landing-hero-landmarks__img--right"
        src={right.src}
        alt=""
        width={320}
        height={320}
        decoding="async"
      />
    </div>
  );
}
