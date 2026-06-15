import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { BottomSheetHandle } from "../ui/BottomSheetHandle";
import { BottomSheetPortal } from "../ui/BottomSheetPortal";
import { useBottomSheetDrag } from "../../hooks/useBottomSheetDrag";
import { useWtrDestPanelMobileSheet } from "../../hooks/useWtrDestPanelMobileSheet";
import type {
  ScoredMapCity,
  MapFilters,
} from "../../lib/whereToRetire/cityMapScoring";
import type { RetirementPreferences } from "../../types/preferences";
import { buildBudgetBreakdownDisplay, DEFAULT_LIFESTYLE } from "../../utils/costOfLiving";
import { CityDetailPanel } from "./cityDetail/CityDetailPanel";
import "./RetirementDestinationPanel.scss";

const MAP_RAIL_SLIDE_MS = 320;
const MAP_RAIL_SLIDE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export type DestinationListNav = {
  index: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
};

type Props = {
  scored: ScoredMapCity | null;
  monthlyIncome: number;
  planMonthlyIncome: number;
  mapFilters: Pick<MapFilters, "lifestyle">;
  preferences: RetirementPreferences;
  open: boolean;
  onClose: () => void;
  listNav: DestinationListNav | null;
};

export function RetirementDestinationPanel({
  scored,
  monthlyIncome,
  planMonthlyIncome,
  mapFilters,
  preferences,
  open,
  onClose,
  listNav,
}: Props) {
  const mobileSheet = useWtrDestPanelMobileSheet();
  const sheetRef = useRef<HTMLElement>(null);
  const mapRailAnimRef = useRef<Animation | null>(null);
  const mapRailWasOpenRef = useRef(false);

  const {
    isDragging,
    panelStyle: dragPanelStyle,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useBottomSheetDrag({
    enabled: mobileSheet,
    open,
    panelRef: sheetRef,
    onDismiss: onClose,
  });

  useEffect(() => {
    const el = sheetRef.current;
    if (!el || mobileSheet) return;

    mapRailAnimRef.current?.cancel();
    mapRailAnimRef.current = null;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setClosedStyles = () => {
      el.style.transform = "translateX(100%)";
      el.style.visibility = "hidden";
      el.style.pointerEvents = "none";
    };

    const setOpenStyles = () => {
      el.style.transform = "translateX(0)";
      el.style.visibility = "visible";
      el.style.pointerEvents = "auto";
    };

    if (reducedMotion) {
      if (open) {
        setOpenStyles();
      } else {
        setClosedStyles();
      }
      mapRailWasOpenRef.current = open;
      return;
    }

    if (open) {
      el.style.visibility = "visible";
      el.style.pointerEvents = "none";
      const anim = el.animate(
        [
          { transform: "translateX(100%)" },
          { transform: "translateX(0)" },
        ],
        {
          duration: MAP_RAIL_SLIDE_MS,
          easing: MAP_RAIL_SLIDE_EASING,
          fill: "forwards",
        },
      );
      mapRailAnimRef.current = anim;
      anim.onfinish = () => {
        setOpenStyles();
        mapRailAnimRef.current = null;
      };
      mapRailWasOpenRef.current = true;
      return () => {
        anim.cancel();
        mapRailAnimRef.current = null;
      };
    }

    if (!mapRailWasOpenRef.current) {
      setClosedStyles();
      return;
    }

    el.style.visibility = "visible";
    el.style.pointerEvents = "none";
    const anim = el.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(100%)" },
      ],
      {
        duration: MAP_RAIL_SLIDE_MS,
        easing: MAP_RAIL_SLIDE_EASING,
        fill: "forwards",
      },
    );
    mapRailAnimRef.current = anim;
    anim.onfinish = () => {
      setClosedStyles();
      mapRailAnimRef.current = null;
    };
    mapRailWasOpenRef.current = false;
    return () => {
      anim.cancel();
      mapRailAnimRef.current = null;
    };
  }, [open, mobileSheet]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const budgetBreakdown = useMemo(
    () =>
      scored
        ? buildBudgetBreakdownDisplay(scored.city, mapFilters.lifestyle ?? DEFAULT_LIFESTYLE)
        : null,
    [scored, mapFilters.lifestyle],
  );

  if (!scored || !budgetBreakdown) return null;

  const sheetStyle: CSSProperties | undefined = mobileSheet
    ? dragPanelStyle
    : undefined;

  return (
    <BottomSheetPortal enabled={mobileSheet}>
      {mobileSheet ? (
        <div
          className={[
            "mobile-bottom-sheet-backdrop",
            open && "mobile-bottom-sheet-backdrop--open",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        ref={sheetRef}
        className={[
          "wtr-dest-panel",
          !mobileSheet && "wtr-dest-panel--map-rail",
          open && "wtr-dest-panel--open",
          mobileSheet && "wtr-dest-panel--sheet",
          isDragging && "mobile-bottom-sheet-panel--dragging",
        ]
          .filter(Boolean)
          .join(" ")}
        style={sheetStyle}
        role="dialog"
        aria-modal={mobileSheet}
        aria-hidden={!open}
        aria-labelledby="wtr-dest-panel-title"
      >
        {mobileSheet ? (
          <BottomSheetHandle
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        ) : null}
        <CityDetailPanel
          scored={scored}
          monthlyIncome={monthlyIncome}
          planMonthlyIncome={planMonthlyIncome}
          mapFilters={mapFilters}
          preferences={preferences}
          budgetBreakdown={budgetBreakdown}
          listNav={listNav}
          mobileSheet={mobileSheet}
          onClose={onClose}
        />
      </aside>
    </BottomSheetPortal>
  );
}
