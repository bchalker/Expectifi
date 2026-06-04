import { useCallback, useEffect, useId, useRef } from "react";
import {
  allocationProfileRowHelperLabel,
  INLINE_ALLOCATION_PROFILE_CARDS,
  type AllocationProfile,
} from "../lib/allocationProfile";
import "./ManualAccountAllocationInline.scss";

type Props = {
  entryId: string;
  profile: AllocationProfile | null | undefined;
  expanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (profile: AllocationProfile) => void;
};

/** Manual account row: helper line + inline allocation card picker. */
export function ManualAccountAllocationInline({
  entryId,
  profile,
  expanded,
  onToggle,
  onClose,
  onSelect,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: MouseEvent) => {
      if (!expanded) return;
      const root = rootRef.current;
      if (root && !root.contains(e.target as Node)) onClose();
    },
    [expanded, onClose],
  );

  useEffect(() => {
    if (!expanded) return;
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [expanded, handlePointerDown]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded, onClose]);

  return (
    <div
      ref={rootRef}
      className="manual-account-allocation"
      data-allocation-entry={entryId}
    >
      <button
        type="button"
        className="manual-account-allocation__trigger"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
      >
        {allocationProfileRowHelperLabel(profile)}
      </button>
      {expanded ? (
        <div
          id={panelId}
          className="manual-account-allocation__panel"
          role="group"
          aria-label="Investment mix"
          onClick={(e) => e.stopPropagation()}
        >
          {INLINE_ALLOCATION_PROFILE_CARDS.map((card) => {
            const selected = profile === card.id;
            return (
              <button
                key={card.id}
                type="button"
                className={[
                  "manual-account-allocation__card",
                  selected && "manual-account-allocation__card--selected",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={selected}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(card.id);
                }}
              >
                <span className="manual-account-allocation__card-title">
                  {card.title}
                </span>
                <span className="manual-account-allocation__card-desc">
                  {card.description}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
