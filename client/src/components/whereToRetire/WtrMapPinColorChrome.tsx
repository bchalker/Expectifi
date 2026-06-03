import {
  resolveWhereToLook,
  type MapFilters,
} from '../../lib/whereToRetire/cityMapScoring'
import type { MapPinColorView } from "../../lib/whereToRetire/mapPinDisplay";
import {
  mapPinViewChromeCopy,
  mapPinViewOptionsForWhereToLook,
} from "../../lib/whereToRetire/mapPinColorCopy";
import { WtrMapWhereToLookGroup } from "./WtrMapWhereToLookGroup";
import { WtrToolbarSelect } from "./WtrToolbarSelect";
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
      <div className="wtr-pin-color-chrome__toolbar-grid">
        <div className="wtr-pin-color-chrome__toolbar-block wtr-pin-color-chrome__toolbar-block--view">
          <h2 className="wtr-pin-color-chrome__heading">{title}</h2>
          <div
            className="wtr-pin-color-chrome__view-group wtr-pin-color-chrome__view-group--buttons"
            role="group"
            aria-label="Map view"
          >
            {pinViewOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={[
                  'wtr-pin-color-chrome__view-btn',
                  pinColorView === opt.id &&
                    'wtr-pin-color-chrome__view-btn--active',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={pinColorView === opt.id}
                onClick={() => onPinColorViewChange(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <WtrToolbarSelect
            className="wtr-pin-color-chrome__view-select"
            ariaLabel="Map view"
            value={pinColorView}
            options={pinViewOptions}
            onChange={onPinColorViewChange}
          />
        </div>

        <div className="wtr-pin-color-chrome__toolbar-block wtr-pin-color-chrome__toolbar-block--scope">
          <h2 className="wtr-pin-color-chrome__heading">Where to look:</h2>
          <WtrMapWhereToLookGroup
            filters={filters}
            onChange={onFiltersChange}
            disableUs={pinColorView === 'expat'}
          />
        </div>
      </div>

      <p className="wtr-pin-color-chrome__description">{description}</p>
    </section>
  );
}
