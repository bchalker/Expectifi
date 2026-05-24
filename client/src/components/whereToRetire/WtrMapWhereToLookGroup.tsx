import {
  applyWhereToLook,
  MAP_WHERE_TO_LOOK_OPTIONS,
  resolveWhereToLook,
  type MapFilters,
  type MapWhereToLook,
} from "../../lib/whereToRetire/cityMapScoring";
import { WtrToolbarSelect } from "./WtrToolbarSelect";

type Props = {
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
  disableUs?: boolean;
  className?: string;
};

export function WtrMapWhereToLookGroup({
  filters,
  onChange,
  disableUs = false,
  className,
}: Props) {
  const active = resolveWhereToLook(filters);

  const setChoice = (choice: MapWhereToLook) => {
    onChange(applyWhereToLook(filters, choice));
  };

  const options = MAP_WHERE_TO_LOOK_OPTIONS.map((opt) => ({
    ...opt,
    disabled: disableUs && opt.id === "us",
  }));

  return (
    <>
      <div
        className={[
          "wtr-pin-color-chrome__where-group",
          "wtr-pin-color-chrome__where-group--buttons",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        role="group"
        aria-label="Where to look"
      >
        {MAP_WHERE_TO_LOOK_OPTIONS.map((opt) => {
          const isDisabled = disableUs && opt.id === "us";
          return (
            <button
              key={opt.id}
              type="button"
              className={[
                "wtr-pin-color-chrome__view-btn",
                active === opt.id && "wtr-pin-color-chrome__view-btn--active",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={active === opt.id}
              disabled={isDisabled}
              onClick={() => setChoice(opt.id)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <WtrToolbarSelect
        className={["wtr-pin-color-chrome__where-select", className]
          .filter(Boolean)
          .join(" ")}
        ariaLabel="Where to look"
        value={active}
        options={options}
        onChange={setChoice}
      />
    </>
  );
}
