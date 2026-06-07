import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ListBox, Select } from "@heroui/react";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { ageFromIsoDateString, isValidIsoDateString } from "../lib/ageFromDob";
import { parseNum } from "../utils/format";
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
import {
  AppSelectMenuScroll,
  overlayScrollbarsViewport,
  refreshOverlayScrollbarsFrom,
} from "./ui/AppSelectMenuScroll";
import "./DateOfBirthSelects.scss";

function ageFromBirthParts(parts: Pick<DobParts, "month" | "year" | "day">): number | null {
  if (!parts.month || !parts.year) return null;
  const iso = dobPartsToIso({
    year: parts.year,
    month: parts.month,
    day: parts.day || "01",
  });
  if (!iso || !isValidIsoDateString(iso) || !isDobAgeInRange(iso)) return null;
  return ageFromIsoDateString(iso);
}

type DobAgeHintProps = {
  iso: string;
  className?: string;
};

/** Helper copy under birth date — age emphasized inline. */
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
  /** Single bordered field — month on the left, year on the right. */
  segmented?: boolean;
  /** Segmented row: year as text input instead of dropdown. */
  yearInput?: boolean;
  /** Show age helper under the field once month and year are selected. */
  showAgeHint?: boolean;
};

export function DateOfBirthSelects({
  value,
  onChange,
  className,
  includeDay = true,
  segmented = false,
  yearInput = false,
  showAgeHint = false,
}: Props) {
  const [parts, setParts] = useState<DobParts>(() => partsFromIsoValue(value));
  const [yearFocused, setYearFocused] = useState(false);
  const [yearDraft, setYearDraft] = useState("");
  const defaultYearItemRef = useRef<HTMLDivElement>(null);
  const monthMenuScrollRef = useRef<OverlayScrollbarsComponentRef>(null);
  const dayMenuScrollRef = useRef<OverlayScrollbarsComponentRef>(null);

  function refreshMenuScroll(ref: RefObject<OverlayScrollbarsComponentRef | null>) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => ref.current?.osInstance()?.update(true));
    });
  }

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

  useEffect(() => {
    if (yearFocused) return;
    setYearDraft(parts.year || "");
  }, [parts.year, yearFocused]);

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

  const commitYearDraft = () => {
    const raw = yearDraft.trim();
    if (!raw) {
      setYearDraft(parts.year || "");
      return;
    }
    const parsed = Math.round(parseNum(raw));
    if (!Number.isFinite(parsed) || raw.length < 4) {
      setYearDraft(parts.year || "");
      return;
    }
    const valid = validBirthYears({
      month: parts.month,
      day: includeDay ? parts.day : "01",
    });
    if (valid.includes(parsed)) {
      applyParts({ year: String(parsed) });
      setYearDraft(String(parsed));
      return;
    }
    if (valid.length > 0) {
      const nearest = valid.reduce((best, cur) =>
        Math.abs(cur - parsed) < Math.abs(best - parsed) ? cur : best,
      );
      applyParts({ year: String(nearest) });
      setYearDraft(String(nearest));
      return;
    }
    setYearDraft(parts.year || "");
  };

  const rowClass = [
    "dob-select-row",
    !includeDay && "dob-select-row--no-day",
    segmented && "dob-select-row--segmented",
    yearInput && "dob-select-row--year-input",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hintAge = showAgeHint
    ? ageFromBirthParts({
        month: parts.month,
        year: parts.year,
        day: includeDay ? parts.day : "01",
      })
    : null;

  function scrollYearListToDefault() {
    if (parts.year) return;
    const item = defaultYearItemRef.current;
    refreshOverlayScrollbarsFrom(item);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!item) return;
        const scroller = overlayScrollbarsViewport(item);
        if (!scroller) return;
        const itemRect = item.getBoundingClientRect();
        const scrollRect = scroller.getBoundingClientRect();
        scroller.scrollTop +=
          itemRect.top -
          scrollRect.top -
          (scrollRect.height - itemRect.height) / 2;
      });
    });
  }

  const monthSelect = (
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
      onOpenChange={(isOpen) => {
        if (isOpen) refreshMenuScroll(monthMenuScrollRef);
      }}
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
        <AppSelectMenuScroll ref={monthMenuScrollRef}>
          <ListBox className="app-select-import-menu__list">
            {DOB_MONTHS.map((mo) => (
              <ListBox.Item key={mo.id} id={mo.id} textValue={mo.label}>
                {mo.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </AppSelectMenuScroll>
      </Select.Popover>
    </Select>
  );

  const yearSelect = (
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
        <AppSelectMenuScroll>
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
        </AppSelectMenuScroll>
      </Select.Popover>
    </Select>
  );

  const yearInputField = (
    <div
      className={[
        "dob-select-row__year",
        parts.year ? "dob-select--filled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "dob-select-row__year-input-wrap",
          parts.year ? "dob-select-row__year-input-wrap--filled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          type="text"
          inputMode="numeric"
          className="dob-select-row__year-input"
          aria-label="Birth year"
          placeholder="Year"
          value={yearFocused ? yearDraft : parts.year}
          maxLength={4}
          onFocus={() => {
            setYearFocused(true);
            setYearDraft(parts.year || "");
          }}
          onChange={(e) =>
            setYearDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 4))
          }
          onBlur={() => {
            setYearFocused(false);
            commitYearDraft();
          }}
        />
      </div>
    </div>
  );

  return (
    <div className={rowClass}>
      {segmented ? (
        <div className="dob-select-row__segment">
          {monthSelect}
          <span className="dob-select-row__divider" aria-hidden />
          {yearInput ? yearInputField : yearSelect}
        </div>
      ) : (
        <>
          {monthSelect}
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
              onOpenChange={(isOpen) => {
                if (isOpen) refreshMenuScroll(dayMenuScrollRef);
              }}
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
                <AppSelectMenuScroll ref={dayMenuScrollRef}>
                  <ListBox className="app-select-import-menu__list">
                    {days.map((d) => (
                      <ListBox.Item key={d} id={d} textValue={d}>
                        {Number(d)}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </AppSelectMenuScroll>
              </Select.Popover>
            </Select>
          ) : null}
          {yearInput ? yearInputField : yearSelect}
        </>
      )}
      {showAgeHint && hintAge != null ? (
        <p className="dob-age-hint" aria-live="polite">
          We use your age (
          <strong className="dob-age-hint__age">{hintAge}</strong>
          ) to estimate how many years your money needs to work for you.
        </p>
      ) : null}
    </div>
  );
}
