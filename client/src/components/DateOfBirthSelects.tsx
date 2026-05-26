import { useEffect, useMemo, useRef, useState } from "react";
import { ListBox, Select } from "@heroui/react";
import { ageFromIsoDateString, isValidIsoDateString } from "../lib/ageFromDob";
import {
  clampDobParts,
  dayOptionsForParts,
  DOB_MONTHS,
  DOB_YEAR_LIST_SCROLL_ANCHOR,
  defaultDobPartsForPicker,
  dobPartsToIso,
  firstKeyFromSelectSelection,
  isDobAgeInRange,
  partsFromIsoValue,
  validBirthYears,
  type DobParts,
} from "../lib/dateOfBirthSelect";
import "./DateOfBirthSelects.scss";

type DobAgeHintProps = {
  iso: string;
  className?: string;
};

/** Helper copy under birth date — age emphasized in dark amber. */
export function DobAgeHint({ iso, className }: DobAgeHintProps) {
  if (!iso || !isValidIsoDateString(iso)) return null;
  const age = ageFromIsoDateString(iso);
  const rootClass = ["dob-age-hint", className].filter(Boolean).join(" ");
  return (
    <p className={rootClass} aria-live="polite">
      We use your age (
      <strong className="dob-age-hint__age">{age}</strong>
      ) to estimate how many years your money needs to work for you.
    </p>
  );
}

type Props = {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  /** When false, only month and year are shown; day defaults to the 1st. */
  includeDay?: boolean;
};

export function DateOfBirthSelects({
  value,
  onChange,
  className,
  includeDay = true,
}: Props) {
  const [parts, setParts] = useState<DobParts>(() => partsFromIsoValue(value));
  const defaultYearItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) {
      setParts(defaultDobPartsForPicker());
      return;
    }
    const fromParent = partsFromIsoValue(value);
    if (!fromParent.year) return;
    setParts((prev) => {
      const prevIso = dobPartsToIso(prev);
      if (prevIso === value) return prev;
      return fromParent;
    });
  }, [value]);

  const days = useMemo(
    () => dayOptionsForParts(parts),
    [parts.year, parts.month],
  );
  const years = useMemo(
    () => validBirthYears({ month: parts.month, day: parts.day }),
    [parts.month, parts.day],
  );

  const applyParts = (patch: Partial<DobParts>) => {
    let next = clampDobParts({ ...parts, ...patch });
    if (!includeDay && next.year && next.month) {
      next = { ...next, day: "01" };
    }
    setParts(next);
    const iso = dobPartsToIso(next);
    if (iso && isDobAgeInRange(iso)) {
      onChange(iso);
      return;
    }
    if (value) onChange("");
  };

  const rowClass = [
    "dob-select-row",
    !includeDay && "dob-select-row--no-day",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  function scrollYearListToDefault() {
    if (parts.year) return;
    requestAnimationFrame(() => {
      const item = defaultYearItemRef.current;
      if (!item) return;
      const scroller = item.closest(
        '[data-slot="list-box"]',
      ) as HTMLElement | null;
      if (!scroller) return;
      const itemRect = item.getBoundingClientRect();
      const scrollRect = scroller.getBoundingClientRect();
      scroller.scrollTop +=
        itemRect.top -
        scrollRect.top -
        (scrollRect.height - itemRect.height) / 2;
    });
  }

  return (
    <div className={rowClass}>
      <Select
        className={[
          "dob-select-row__month",
          parts.month ? "dob-select--filled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        variant="secondary"
        aria-label="Birth month"
        placeholder="Month"
        selectedKey={parts.month || null}
        onSelectionChange={(keys) => {
          const id = firstKeyFromSelectSelection(keys);
          if (!id) return;
          applyParts({ month: id });
        }}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="app-select-import-menu__popover dob-select-menu__popover">
          <ListBox className="app-select-import-menu__list">
            {DOB_MONTHS.map((mo) => (
              <ListBox.Item key={mo.id} id={mo.id} textValue={mo.label}>
                {mo.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {includeDay ? (
        <Select
          className={[
            "dob-select-row__day",
            parts.day ? "dob-select--filled" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          variant="secondary"
          aria-label="Birth day"
          placeholder="Day"
          selectedKey={parts.day || null}
          onSelectionChange={(keys) => {
            const id = firstKeyFromSelectSelection(keys);
            if (!id) return;
            applyParts({ day: id });
          }}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover className="app-select-import-menu__popover dob-select-menu__popover">
            <ListBox className="app-select-import-menu__list">
              {days.map((d) => (
                <ListBox.Item key={d} id={d} textValue={d}>
                  {Number(d)}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      ) : null}
      <Select
        className={[
          "dob-select-row__year",
          parts.year ? "dob-select--filled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        variant="secondary"
        aria-label="Birth year"
        placeholder="Year"
        selectedKey={parts.year || null}
        onOpenChange={(isOpen) => {
          if (isOpen) scrollYearListToDefault();
        }}
        onSelectionChange={(keys) => {
          const id = firstKeyFromSelectSelection(keys);
          if (!id) return;
          applyParts({ year: id });
        }}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="app-select-import-menu__popover dob-select-menu__popover">
          <ListBox className="app-select-import-menu__list">
            {years.map((y) => (
              <ListBox.Item
                key={String(y)}
                id={String(y)}
                textValue={String(y)}
                ref={
                  y === DOB_YEAR_LIST_SCROLL_ANCHOR
                    ? defaultYearItemRef
                    : undefined
                }
              >
                {y}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
