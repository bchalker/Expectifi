import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { IconChevronDown } from "@tabler/icons-react";
import { ListBox } from "@heroui/react";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { firstKeyFromSelectSelection } from "../lib/dateOfBirthSelect";
import { AppSelectMenuScroll } from "./ui/AppSelectMenuScroll";
import "./DobTypeaheadSelect.scss";

export type DobTypeaheadOption = {
  id: string;
  label: string;
};

type Props = {
  className?: string;
  ariaLabel: string;
  placeholder: string;
  options: DobTypeaheadOption[];
  selectedId: string;
  onCommit: (id: string) => void;
  filterOptions: (query: string) => DobTypeaheadOption[];
  resolveIdFromQuery: (query: string) => string | null;
  inputMode?: "text" | "numeric";
  maxLength?: number;
  sanitizeInput?: (raw: string) => string;
  menuScrollRef?: RefObject<OverlayScrollbarsComponentRef | null>;
  onOpen?: () => void;
  tabularNums?: boolean;
  scrollAnchorId?: string;
  scrollAnchorRef?: RefObject<HTMLDivElement | null>;
};

export function DobTypeaheadSelect({
  className,
  ariaLabel,
  placeholder,
  options,
  selectedId,
  onCommit,
  filterOptions,
  resolveIdFromQuery,
  inputMode = "text",
  maxLength,
  sanitizeInput,
  menuScrollRef,
  onOpen,
  tabularNums = false,
  scrollAnchorId,
  scrollAnchorRef,
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef("");
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  draftRef.current = draft;

  const selected = useMemo(
    () => options.find((opt) => opt.id === selectedId) ?? null,
    [options, selectedId],
  );

  const filtered = useMemo(
    () => filterOptions(focused || open ? draft : ""),
    [draft, filterOptions, focused, open],
  );

  const displayValue = focused || open ? draft : selected?.label ?? "";

  const showPlaceholder = !displayValue && !focused;

  useEffect(() => {
    if (!open) return;
    onOpen?.();
  }, [open, onOpen]);

  const updateMenuPosition = useCallback(() => {
    const anchor = rootRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 1300,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || filtered.length === 0) return;
    updateMenuPosition();
    const raf = requestAnimationFrame(updateMenuPosition);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, filtered.length, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      const resolved = resolveIdFromQuery(draftRef.current);
      if (resolved) {
        onCommit(resolved);
      }
      setDraft("");
      setOpen(false);
      setFocused(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onCommit, resolveIdFromQuery]);

  function commitDraft() {
    const resolved = resolveIdFromQuery(draft);
    if (resolved) {
      onCommit(resolved);
      setDraft("");
      return;
    }
    if (selectedId) setDraft("");
  }

  function selectOption(id: string) {
    onCommit(id);
    setDraft("");
    setOpen(false);
    setFocused(false);
    inputRef.current?.blur();
  }

  function handleFocus() {
    setFocused(true);
    setOpen(true);
    setDraft(selected?.label ?? "");
  }

  function handleBlur() {
    setFocused(false);
    commitDraft();
    setOpen(false);
  }

  function handleChange(raw: string) {
    const next = sanitizeInput ? sanitizeInput(raw) : raw;
    setDraft(next);
    setOpen(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setDraft("");
      setOpen(false);
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const resolved = resolveIdFromQuery(draft);
      if (resolved) {
        selectOption(resolved);
        return;
      }
      if (filtered[0]) selectOption(filtered[0].id);
    }
  }

  const rootClass = ["dob-typeahead", className].filter(Boolean).join(" ");
  const inputClass = [
    "dob-typeahead__input",
    tabularNums ? "dob-typeahead__input--tabular" : "",
    showPlaceholder ? "dob-typeahead__input--placeholder" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const menu =
    open && filtered.length > 0 ? (
      <div
        ref={menuRef}
        className="dob-typeahead__menu dob-typeahead__menu--portaled dob-select-menu__popover"
        style={menuStyle}
        onMouseDown={(event) => event.preventDefault()}
      >
        <AppSelectMenuScroll ref={menuScrollRef}>
          <ListBox
            id={`${listboxId}-listbox`}
            className="app-select-import-menu__list dob-typeahead__list"
            aria-label={ariaLabel}
            selectionMode="single"
            selectedKeys={selectedId ? [selectedId] : []}
            onSelectionChange={(keys) => {
              const id = firstKeyFromSelectSelection(keys);
              if (!id) return;
              selectOption(id);
            }}
          >
            {filtered.map((opt) => (
              <ListBox.Item
                key={opt.id}
                id={opt.id}
                textValue={opt.label}
                ref={
                  scrollAnchorId && opt.id === scrollAnchorId
                    ? scrollAnchorRef
                    : undefined
                }
              >
                {opt.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </AppSelectMenuScroll>
      </div>
    ) : null;

  return (
    <>
      <div className={rootClass} ref={rootRef}>
        <input
          ref={inputRef}
          id={listboxId}
          type="text"
          inputMode={inputMode}
          className={inputClass}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={`${listboxId}-listbox`}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={displayValue}
          maxLength={maxLength}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span className="dob-typeahead__indicator" aria-hidden>
          <IconChevronDown size={16} strokeWidth={1.5} />
        </span>
      </div>
      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
    </>
  );
}
