import { IconCornerDownRight, IconX } from "@tabler/icons-react";
import { Popover } from "@heroui/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import "./WtrSpouseBudgetHelpPopout.scss";

const WTR_SPOUSE_BUDGET_HELP_MOBILE_SHEET_MQ = "(max-width: 680px)";

function useWtrSpouseBudgetHelpMobileSheet(): boolean {
  const [isMobileSheet, setIsMobileSheet] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(WTR_SPOUSE_BUDGET_HELP_MOBILE_SHEET_MQ).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(WTR_SPOUSE_BUDGET_HELP_MOBILE_SHEET_MQ);
    const sync = () => setIsMobileSheet(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobileSheet;
}

function WtrSpouseBudgetHelpListItem({ children }: { children: ReactNode }) {
  return (
    <li className="wtr-spouse-budget-help__list-item">
      <IconCornerDownRight
        className="wtr-spouse-budget-help__list-icon"
        size={14}
        stroke={1.25}
        aria-hidden
      />
      <span className="wtr-spouse-budget-help__list-copy">{children}</span>
    </li>
  );
}

function WtrSpouseBudgetHelpContent() {
  return (
    <>
      <p className="wtr-spouse-budget-help__body font-sm">
        When enabled, monthly costs assume <strong>two adults in one household</strong>{" "}
        — not two separate budgets.
      </p>
      <ul className="wtr-spouse-budget-help__list">
        <WtrSpouseBudgetHelpListItem>
          <strong>Rent &amp; utilities</strong> — one home at your selected bedroom
          size; not doubled.
        </WtrSpouseBudgetHelpListItem>
        <WtrSpouseBudgetHelpListItem>
          <strong>Groceries</strong> — shared basket scaled ×1.6 (not 2×).
        </WtrSpouseBudgetHelpListItem>
        <WtrSpouseBudgetHelpListItem>
          <strong>Per-person costs</strong> — casual dining, coffee, alcohol out,
          transit passes, mobile, gym, cinema, clothing, and health insurance scale
          for two adults.
        </WtrSpouseBudgetHelpListItem>
        <WtrSpouseBudgetHelpListItem>
          <strong>Upscale dining</strong> — already priced as a meal for two.
        </WtrSpouseBudgetHelpListItem>
        <WtrSpouseBudgetHelpListItem>
          <strong>Incidentals</strong> — calculated as a share of the adjusted
          subtotal.
        </WtrSpouseBudgetHelpListItem>
      </ul>
    </>
  );
}

type WtrSpouseBudgetHelpPanelProps = {
  titleId: string;
  showClose?: boolean;
  onClose?: () => void;
};

function WtrSpouseBudgetHelpPanel({
  titleId,
  showClose = false,
  onClose,
}: WtrSpouseBudgetHelpPanelProps) {
  return (
    <>
      <header className="wtr-spouse-budget-help__head">
        <h2 id={titleId} className="wtr-spouse-budget-help__title">
          Budgeting with a spouse or partner
        </h2>
        {showClose && onClose ? (
          <button
            type="button"
            className="wtr-spouse-budget-help__close"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX size={18} stroke={1.5} aria-hidden />
          </button>
        ) : null}
      </header>
      <div className="wtr-spouse-budget-help__content">
        <WtrSpouseBudgetHelpContent />
      </div>
    </>
  );
}

const SpouseBudgetHelpTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithRef<"button"> & { open?: boolean }
>(function SpouseBudgetHelpTrigger(
  { open, className = "", onClick, onMouseDown, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={["wtr-spouse-budget-help__trigger", className].filter(Boolean).join(" ")}
      aria-label="How spouse or partner affects budget estimates"
      aria-expanded={open}
      {...props}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick?.(event);
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onMouseDown?.(event);
      }}
    >
      Include
    </button>
  );
});

export function WtrSpouseBudgetHelpPopout() {
  const [open, setOpen] = useState(false);
  const isMobileSheet = useWtrSpouseBudgetHelpMobileSheet();
  const titleId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open || !isMobileSheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobileSheet]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const trigger = (
    <SpouseBudgetHelpTrigger open={open} onClick={() => setOpen((prev) => !prev)} />
  );

  if (isMobileSheet) {
    return (
      <>
        {trigger}
        {open
          ? createPortal(
              <>
                <button
                  type="button"
                  className="wtr-spouse-budget-help__backdrop"
                  aria-label="Close"
                  onClick={close}
                />
                <div
                  className="wtr-spouse-budget-help__sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                >
                  <WtrSpouseBudgetHelpPanel
                    titleId={titleId}
                    showClose
                    onClose={close}
                  />
                </div>
              </>,
              document.body,
            )
          : null}
      </>
    );
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={(triggerProps) => (
          <SpouseBudgetHelpTrigger
            open={open}
            {...(triggerProps as ComponentPropsWithRef<"button">)}
          />
        )}
      />
      <Popover.Content
        placement="top"
        offset={8}
        shouldFlip
        className="wtr-spouse-budget-help-popover"
      >
        <Popover.Arrow className="wtr-spouse-budget-help-popover__arrow" />
        <Popover.Dialog
          className="wtr-spouse-budget-help-popover__dialog"
          aria-labelledby={titleId}
        >
          <WtrSpouseBudgetHelpPanel titleId={titleId} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
