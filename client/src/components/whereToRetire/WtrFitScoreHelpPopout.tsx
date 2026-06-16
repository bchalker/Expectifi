import { IconProgressHelp, IconX } from "@tabler/icons-react";
import { Popover } from "@heroui/react";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  ALL_CORE_KEYS,
  getFactorDefinition,
} from "../../utils/preferenceFactors";
import "./WtrFitScoreHelpPopout.scss";

const WTR_FIT_SCORE_MOBILE_SHEET_MQ = "(max-width: 680px)";

function useWtrFitScoreMobileSheet(): boolean {
  const [isMobileSheet, setIsMobileSheet] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(WTR_FIT_SCORE_MOBILE_SHEET_MQ).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(WTR_FIT_SCORE_MOBILE_SHEET_MQ);
    const sync = () => setIsMobileSheet(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobileSheet;
}

function WtrFitScoreHelpContent() {
  return (
    <>
      <p className="wtr-fit-score-help__body font-sm">
        Each destination&apos;s <strong>Fit</strong> score (
        <strong>0–100</strong>) blends cost of living, quality of life,
        affordability, healthcare, climate, and other factors — weighted by your
        Travel Priorities. Update my preferences to adjust them.
      </p>
      <ul
        className="wtr-fit-score-help__factors"
        aria-label="Travel Priorities factors"
      >
        {ALL_CORE_KEYS.map((key) => (
          <li key={key} className="wtr-fit-score-help__factor">
            {getFactorDefinition(key).label}
          </li>
        ))}
      </ul>
    </>
  );
}

type WtrFitScoreHelpPanelProps = {
  titleId: string;
  showClose?: boolean;
  onClose?: () => void;
};

function WtrFitScoreHelpPanel({
  titleId,
  showClose = false,
  onClose,
}: WtrFitScoreHelpPanelProps) {
  return (
    <>
      <header className="wtr-fit-score-help__head">
        <h2 id={titleId} className="wtr-fit-score-help__title">
          How your Fit score works
        </h2>
        {showClose && onClose ? (
          <button
            type="button"
            className="wtr-fit-score-help__close"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX size={18} stroke={1.5} aria-hidden />
          </button>
        ) : null}
      </header>
      <div className="wtr-fit-score-help__content">
        <WtrFitScoreHelpContent />
      </div>
    </>
  );
}

export function WtrFitScoreHelpPopout() {
  const [open, setOpen] = useState(false);
  const isMobileSheet = useWtrFitScoreMobileSheet();
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
    <button
      type="button"
      className="wtr-fit-score-help-trigger"
      aria-label="How your Fit score works"
      aria-expanded={open}
      onClick={() => setOpen((prev) => !prev)}
    >
      <IconProgressHelp size={24} stroke={1.5} aria-hidden />
    </button>
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
                  className="wtr-fit-score-help__backdrop"
                  aria-label="Close"
                  onClick={close}
                />
                <div
                  className="wtr-fit-score-help__sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={titleId}
                >
                  <WtrFitScoreHelpPanel
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
        className="wtr-fit-score-help-trigger"
        aria-label="How your Fit score works"
      >
        <IconProgressHelp size={24} stroke={1.5} aria-hidden />
      </Popover.Trigger>
      <Popover.Content
        placement="left"
        offset={8}
        shouldFlip
        className="wtr-fit-score-help-popover"
      >
        <Popover.Arrow className="wtr-fit-score-help-popover__arrow" />
        <Popover.Dialog
          className="wtr-fit-score-help-popover__dialog"
          aria-labelledby={titleId}
        >
          <WtrFitScoreHelpPanel titleId={titleId} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
