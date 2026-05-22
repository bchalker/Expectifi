import { IconArrowNarrowRightDashed } from "@tabler/icons-react";
import {
  resolveWhereToLook,
  type MapFilters,
} from "../../lib/whereToRetire/cityMapScoring";
import type { MapPinColorView } from "../../lib/whereToRetire/mapPinDisplay";
import {
  mapPinViewChromeCopy,
  mapPinViewOptionsForWhereToLook,
} from "../../lib/whereToRetire/mapPinColorCopy";
import { WtrMapWhereToLookGroup } from "./WtrMapWhereToLookGroup";
import "./WtrMapPinColorChrome.scss";

type Props = {
  pinColorView: MapPinColorView;
  onPinColorViewChange: (view: MapPinColorView) => void;
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  className?: string;
};

export function WtrMapPinColorChrome({
  pinColorView,
  onPinColorViewChange,
  filters,
  onFiltersChange,
  className,
}: Props) {
  const whereToLook = resolveWhereToLook(filters);
  const pinViewOptions = mapPinViewOptionsForWhereToLook(whereToLook);
  const { title, description } = mapPinViewChromeCopy(pinColorView);

  return (
    <section
      className={["wtr-pin-color-chrome", className].filter(Boolean).join(" ")}
      aria-label="Map pin coloring"
    >
      <div className="wtr-pin-color-chrome__toolbar">
        <div className="wtr-pin-color-chrome__toolbar-block">
          <h2 className="wtr-pin-color-chrome__heading">{title}</h2>
          <div
            className="wtr-pin-color-chrome__view-group"
            role="group"
            aria-label="Map view"
          >
            {pinViewOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={[
                  "wtr-pin-color-chrome__view-btn",
                  pinColorView === opt.id &&
                    "wtr-pin-color-chrome__view-btn--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={pinColorView === opt.id}
                onClick={() => onPinColorViewChange(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <span className="wtr-pin-color-chrome__toolbar-separator" aria-hidden>
          <IconArrowNarrowRightDashed size={18} stroke={1.5} />
        </span>

        <div className="wtr-pin-color-chrome__toolbar-block wtr-pin-color-chrome__toolbar-block--scope">
          <h2 className="wtr-pin-color-chrome__heading">Where to look:</h2>
          <WtrMapWhereToLookGroup
            filters={filters}
            onChange={onFiltersChange}
            disableUs={pinColorView === "expat"}
          />
        </div>
      </div>

      <p className="wtr-pin-color-chrome__description">{description}</p>
    </section>
  );
}
