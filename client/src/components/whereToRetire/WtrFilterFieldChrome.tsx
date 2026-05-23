import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import "./WtrFilterFieldChrome.scss";

function onSwitchKeyDown(event: ReactKeyboardEvent, toggle: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggle();
  }
}

type ToggleBoxProps = {
  label: string;
  subtitle?: string;
  pressed: boolean;
  onToggle: () => void;
  /** Shown below the toggle row when `pressed` (e.g. dropdown or amount input). */
  embedded?: ReactNode;
  className?: string;
};

export function WtrFilterToggleBox({
  label,
  subtitle,
  pressed,
  onToggle,
  embedded,
  className,
}: ToggleBoxProps) {
  const ariaLabel = subtitle ? `${label}, ${subtitle}` : label;

  return (
    <div
      className={[
        "wtr-filter-toggle",
        pressed ? "wtr-filter-toggle--on" : "",
        embedded ? "wtr-filter-toggle--embeddable" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        role="switch"
        tabIndex={0}
        aria-checked={pressed}
        aria-label={ariaLabel}
        className="wtr-filter-toggle__row"
        onClick={onToggle}
        onKeyDown={(e) => onSwitchKeyDown(e, onToggle)}
      >
        <div className="wtr-filter-toggle__copy">
          <span className="wtr-filter-toggle__label">{label}</span>
          {subtitle ? (
            <span className="wtr-filter-toggle__sub">{subtitle}</span>
          ) : null}
        </div>
        <span className="wtr-filter-toggle__track" aria-hidden />
      </div>
      {pressed && embedded ? (
        <div
          className="wtr-filter-toggle__embedded"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {embedded}
        </div>
      ) : null}
    </div>
  );
}

export type WtrFilterSegmentOption<T extends string> = {
  id: T;
  label: string;
};

type SegmentedRowProps<T extends string> = {
  label: string;
  ariaLabel: string;
  value: T;
  options: WtrFilterSegmentOption<T>[];
  onChange: (id: T) => void;
};

export function WtrFilterSegmentedRow<T extends string>({
  label,
  ariaLabel,
  value,
  options,
  onChange,
}: SegmentedRowProps<T>) {
  const labelId = `wtr-filter-seg-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="wtr-filter-segment-row">
      <span className="wtr-filter-segment-row__label" id={labelId}>
        {label}
      </span>
      <div
        className="wtr-filter-segment-row__control"
        role="radiogroup"
        aria-labelledby={labelId}
        aria-label={ariaLabel}
      >
        <div className="wtr-filter-segment">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={value === opt.id}
              className={`wtr-filter-segment__btn${
                value === opt.id ? " wtr-filter-segment__btn--on" : ""
              }`}
              onClick={() => onChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
