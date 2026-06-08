import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import { useUserTier } from "../hooks/useUserTier";
import { loadCsvSession } from "../lib/planStorage/csvSession";
import { dismissProNudge, isProNudgeDismissed } from "../lib/proNudgeDismissed";
import { isSessionSavePlanDismissed } from "../lib/sessionFlags";
import { AppButton } from "./ui/AppButton";
import "./AccountPlanBottomBanner.scss";

const SHOW_DELAY_MS = 1500;
const CONFIRMATION_MS = 4000;
const PHASE_TRANSITION_MS = 250;
const HIDE_BANNER_MQ = "(max-width: 760px)";

function useHidePlanBannerOnMobile() {
  const [hide, setHide] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(HIDE_BANNER_MQ).matches,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(HIDE_BANNER_MQ);
    const onChange = () => setHide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return hide;
}

type AccountPlanBottomBannerProps = {
  onOpenUpgrade?: () => void;
};

type DisplayPanel = "phase1" | "confirmation" | "phase2";

function hasSessionCsvImportData(): boolean {
  return loadCsvSession() != null;
}

function phase2Eligible(
  user: unknown,
  isPro: boolean,
  tier: string,
  proNudgeDismissed: boolean,
): boolean {
  return (
    !user &&
    !isPro &&
    (tier === "browser_saved" || isSessionSavePlanDismissed()) &&
    !proNudgeDismissed
  );
}

function syncBannerReserveHeight(heightPx: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--app-plan-banner-h",
    heightPx > 0 ? `${heightPx}px` : "0px",
  );
  document.documentElement.classList.toggle(
    "app-has-plan-banner",
    heightPx > 0,
  );
}

export function AccountPlanBottomBanner({
  onOpenUpgrade,
}: AccountPlanBottomBannerProps) {
  const { user } = useAuth();
  const {
    showSavePlanPrompt,
    acceptBrowserSave,
    dismissSavePlanPrompt,
    tier,
    isPro,
    hasSessionCsvHoldings,
  } = useUserTier();

  const hideOnMobile = useHidePlanBannerOnMobile();
  const bannerRef = useRef<HTMLDivElement>(null);
  const [proNudgeDismissed, setProNudgeDismissed] = useState(() =>
    isProNudgeDismissed(),
  );
  const [confirmationHadCsv, setConfirmationHadCsv] = useState(false);
  const [phase1Mounted, setPhase1Mounted] = useState(false);
  const [displayPanel, setDisplayPanel] = useState<DisplayPanel | null>(null);
  const [motion, setMotion] = useState<
    "idle" | "enter-from" | "enter-active" | "exit"
  >("idle");
  const transitionTimerRef = useRef<number | null>(null);
  const coldStartPhase2Ref = useRef(false);

  const hasCsvImport = useMemo(
    () => hasSessionCsvImportData() || hasSessionCsvHoldings,
    [hasSessionCsvHoldings],
  );

  const showPhase1 = showSavePlanPrompt;
  const showPhase2 = phase2Eligible(user, isPro, tier, proNudgeDismissed);
  const bannerVisible = displayPanel != null;

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current != null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

  const beginEnter = useCallback(() => {
    setMotion("enter-from");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setMotion("enter-active"));
    });
  }, []);

  const runExitThen = useCallback(
    (onComplete: () => void) => {
      clearTransitionTimer();
      setMotion("exit");
      transitionTimerRef.current = window.setTimeout(() => {
        transitionTimerRef.current = null;
        onComplete();
      }, PHASE_TRANSITION_MS);
    },
    [clearTransitionTimer],
  );

  useEffect(() => () => clearTransitionTimer(), [clearTransitionTimer]);

  useEffect(
    () => () => {
      syncBannerReserveHeight(0);
    },
    [],
  );

  useEffect(() => {
    if (hideOnMobile) {
      syncBannerReserveHeight(0);
    }
  }, [hideOnMobile]);

  useEffect(() => {
    if (hideOnMobile || !bannerVisible) {
      syncBannerReserveHeight(0);
      return;
    }
    const el = bannerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      syncBannerReserveHeight(el.getBoundingClientRect().height);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bannerVisible, displayPanel, motion, hideOnMobile]);

  useEffect(() => {
    if (!showPhase1) {
      setPhase1Mounted(false);
      return;
    }
    const showId = window.setTimeout(
      () => setPhase1Mounted(true),
      SHOW_DELAY_MS,
    );
    return () => window.clearTimeout(showId);
  }, [showPhase1]);

  useEffect(() => {
    if (!showPhase1 || !phase1Mounted || displayPanel != null) return;
    setDisplayPanel("phase1");
    beginEnter();
  }, [showPhase1, phase1Mounted, displayPanel, beginEnter]);

  useEffect(() => {
    if (!showPhase2 || showPhase1 || displayPanel != null) return;
    if (coldStartPhase2Ref.current) return;
    coldStartPhase2Ref.current = true;
    setDisplayPanel("phase2");
    setMotion("enter-active");
  }, [showPhase2, showPhase1, displayPanel]);

  useEffect(() => {
    if (displayPanel !== "confirmation") return;
    const confirmId = window.setTimeout(() => {
      runExitThen(() => {
        if (phase2Eligible(user, isPro, tier, proNudgeDismissed)) {
          setDisplayPanel("phase2");
          beginEnter();
        } else {
          setDisplayPanel(null);
          setMotion("idle");
        }
      });
    }, CONFIRMATION_MS);
    return () => window.clearTimeout(confirmId);
  }, [
    displayPanel,
    beginEnter,
    runExitThen,
    user,
    isPro,
    tier,
    proNudgeDismissed,
  ]);

  function handleSave() {
    if (displayPanel !== "phase1") return;
    setConfirmationHadCsv(hasCsvImport);
    acceptBrowserSave();
    runExitThen(() => {
      setDisplayPanel("confirmation");
      beginEnter();
    });
  }

  function handleNotNow() {
    if (displayPanel !== "phase1") return;
    dismissSavePlanPrompt();
    runExitThen(() => {
      const showNudge =
        !user &&
        !isPro &&
        (tier === "browser_saved" || isSessionSavePlanDismissed()) &&
        !proNudgeDismissed;
      if (showNudge) {
        setDisplayPanel("phase2");
        beginEnter();
      } else {
        setDisplayPanel(null);
        setMotion("idle");
      }
    });
  }

  function handleDismissProNudge() {
    dismissProNudge();
    setProNudgeDismissed(true);
    runExitThen(() => {
      setDisplayPanel(null);
      setMotion("idle");
    });
  }

  if (
    hideOnMobile ||
    !bannerVisible ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const panelMotionClass =
    motion === "exit"
      ? "account-plan-bottom-banner-fixed__panel--exit"
      : motion === "enter-from"
        ? "account-plan-bottom-banner-fixed__panel--enter-from"
        : "account-plan-bottom-banner-fixed__panel--enter-active";

  return createPortal(
    <div ref={bannerRef} className="account-plan-bottom-banner-fixed">
      <div
        className={[
          "account-plan-bottom-banner-fixed__panel",
          panelMotionClass,
        ].join(" ")}
      >
        {displayPanel === "phase1" ? (
          <div
            className="account-plan-bottom-banner-fixed__inner"
            role="region"
            aria-live="polite"
            aria-label="Save your plan"
          >
            <p className="account-plan-bottom-banner__message">
              {hasCsvImport
                ? "Your profile and settings will be saved to this browser. Imported positions stay in this session only."
                : "Your profile and settings will be saved to this browser."}
            </p>
            <div className="account-plan-bottom-banner__actions">
              <button
                type="button"
                className="account-plan-bottom-banner__dismiss-link"
                onClick={handleNotNow}
              >
                Not now
              </button>
              <AppButton
                type="button"
                size="sm"
                variant="primary"
                className="account-plan-bottom-banner__pill"
                onPress={handleSave}
              >
                Save my plan
              </AppButton>
            </div>
          </div>
        ) : null}

        {displayPanel === "confirmation" ? (
          <div
            className="account-plan-bottom-banner-fixed__inner"
            role="status"
            aria-live="polite"
            aria-label="Plan saved"
          >
            <p className="account-plan-bottom-banner__message account-plan-bottom-banner__message--solo">
              {confirmationHadCsv
                ? "Settings and goals saved. Your imported positions are only held in this session."
                : "Settings and goals saved to this browser."}
            </p>
          </div>
        ) : null}

        {displayPanel === "phase2" ? (
          <div
            className="account-plan-bottom-banner-fixed__inner"
            role="region"
            aria-live="polite"
            aria-label="Upgrade to Pro"
          >
            <p className="account-plan-bottom-banner__message">
              {hasCsvImport
                ? "Imported positions don't survive a refresh. Pro keeps them."
                : "Your plan lives in this browser. Upgrade to Pro to take it anywhere."}
            </p>
            <div className="account-plan-bottom-banner__actions">
              {onOpenUpgrade ? (
                <AppButton
                  type="button"
                  size="sm"
                  variant="primary"
                  className="account-plan-bottom-banner__pill"
                  onPress={onOpenUpgrade}
                >
                  Upgrade to Pro
                </AppButton>
              ) : null}
              <button
                type="button"
                className="account-plan-bottom-banner__dismiss-icon"
                aria-label="Dismiss"
                onClick={handleDismissProNudge}
              >
                <IconX size={14} stroke={1.5} aria-hidden />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
