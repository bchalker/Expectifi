import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { PreferencesWizardModal } from "../components/preferences/PreferencesWizardModal";
import { RetirementMapExplorer } from "../components/whereToRetire/RetirementMapExplorer";
import { WtrFiltersSidebar } from "../components/whereToRetire/WtrFiltersSidebar";
import type { MapOptionsPanelTab } from "../components/whereToRetire/RetirementMapFilters";
import {
  WTR_OPEN_FILTERS_EVENT,
  WTR_OPEN_PREFERENCES_EVENT,
  type WtrFilterScrollTarget,
  type WtrOpenFiltersDetail,
  type WtrOpenPreferencesDetail,
} from "../lib/whereToRetire/wtrFilterPriorityCrossRef";
import type { CorePreferenceKey } from "../types/preferences";
import { WtrComparisonTableView } from "../components/whereToRetire/WtrComparisonTableView";
import type { ComputedSnapshot } from "../lib/computeResults";
import { APP_DASHBOARD_PATH, navigateApp } from "../lib/appPaths";
import {
  ALL_DESTINATION_REGIONS,
  buildLifestyleInputs,
  countActiveMapFilters,
  DEFAULT_BUDGET_PREFERENCES,
  DEFAULT_MAP_FILTERS,
  type MapFilters,
} from "../lib/whereToRetire/cityMapScoring";
import {
  loadBudgetPreferences,
  saveBudgetPreferences,
} from "../lib/whereToRetire/storage";
import {
  clampExplorationIncome,
  defaultExplorationIncome,
  isAtProjectedExplorationIncome,
  resolveExplorationIncome,
} from "../lib/whereToRetire/budgetExplorationStats";
import { readStashedWtrExplorationIncome } from "../lib/whereToRetire/wtrPreviewIncome";
import { useRetirementMapStorage } from "../hooks/useRetirementMapStorage";
import { useRetirementPreferences } from "../hooks/useRetirementPreferences";
import { useUserTier } from "../hooks/useUserTier";
import { hasRetirementPreferences } from "../types/preferences";
import { PLAN_STATE_SERVER_HYDRATED_EVENT } from "../lib/planStateServerSync";
import { useWtrMapPinColorView } from "../hooks/useWtrMapPinColorView";
import {
  hasNonDefaultUserExclusions,
} from "../lib/retirementStorage";
import type { MapCity } from "../utils/costOfLiving";
import { AppToast } from "../components/ui/AppToast";
import {
  HIDE_LEVEL3_CAUTIONS_TOAST_MESSAGE,
  WTR_HIDE_LEVEL3_CAUTIONS_EVENT,
} from "../lib/whereToRetire/wtrHideLevel3Cautions";
import "../components/TaxSummaryLayout.scss";
import "./WhereToRetire.scss";

type WtrViewMode = "map" | "compare";

type Props = {
  c: ComputedSnapshot;
};

export function WhereToRetire({ c }: Props) {
  const grossMonthlyIncome = c.grossMon;
  const [viewMode, setViewMode] = useState<WtrViewMode>("map");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [baselineCity, setBaselineCity] = useState<MapCity | null>(null);
  const storage = useRetirementMapStorage();
  const { isHydrated } = useUserTier();
  const { prefs, setPrefs, reloadPrefs, hasSavedPrefs } = useRetirementPreferences();
  const [preferencesWizardOpen, setPreferencesWizardOpen] = useState(false);
  const [preferencesInitialStep, setPreferencesInitialStep] = useState(1);
  const [preferencesScrollFactorId, setPreferencesScrollFactorId] =
    useState<CorePreferenceKey | null>(null);
  const [filterCrossRefHighlight, setFilterCrossRefHighlight] =
    useState<WtrFilterScrollTarget | null>(null);
  const [prefsUpdatedFlash, setPrefsUpdatedFlash] = useState(false);
  const [explorationIncome, setExplorationIncome] = useState(() => {
    const stashed = readStashedWtrExplorationIncome();
    if (stashed != null)
      return clampExplorationIncome(stashed, grossMonthlyIncome);
    return defaultExplorationIncome(grossMonthlyIncome);
  });
  const mapExplorationIncome = useMemo(
    () => resolveExplorationIncome(grossMonthlyIncome, explorationIncome),
    [grossMonthlyIncome, explorationIncome],
  );
  const [mapFilters, setMapFilters] = useState<MapFilters>(() => {
    const savedBudget = loadBudgetPreferences();
    const budgetPreferences = savedBudget ?? DEFAULT_BUDGET_PREFERENCES;
    return {
      ...DEFAULT_MAP_FILTERS,
      regions: [...ALL_DESTINATION_REGIONS],
      budgetPreferences,
      lifestyle: buildLifestyleInputs(budgetPreferences),
    };
  });
  const { pinColorView, handlePinColorViewChange } = useWtrMapPinColorView(
    mapFilters,
    setMapFilters,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<MapOptionsPanelTab>("filters");
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [hideLevel3ToastVisible, setHideLevel3ToastVisible] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const notifyMapLayout = useCallback(() => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    notifyMapLayout();
  }, [notifyMapLayout]);

  const openDrawerTab = useCallback(
    (tab: MapOptionsPanelTab) => {
      setDrawerTab(tab);
      setDrawerOpen(true);
      notifyMapLayout();
    },
    [notifyMapLayout],
  );

  const openPreferencesWizard = useCallback(
    (detail?: WtrOpenPreferencesDetail) => {
      setPreferencesInitialStep(detail?.step ?? 1);
      setPreferencesScrollFactorId(detail?.factorId ?? null);
      setPreferencesWizardOpen(true);
    },
    [],
  );

  const openFiltersFromCrossRef = useCallback(
    (detail?: WtrOpenFiltersDetail) => {
      setPreferencesWizardOpen(false);
      if (detail?.crossRefKey) {
        setFilterCrossRefHighlight(detail.crossRefKey);
      }
      openDrawerTab("filters");
    },
    [openDrawerTab],
  );

  const handleMapFiltersChange = useCallback(
    (next: MapFilters | ((prev: MapFilters) => MapFilters)) => {
      setMapFilters((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        saveBudgetPreferences(resolved.budgetPreferences);
        return resolved;
      });
    },
    [],
  );

  useEffect(() => {
    const onHideLevel3 = () => {
      setMapFilters((prev) => {
        if (prev.hideLevel3Cautions) return prev;
        const next = { ...prev, hideLevel3Cautions: true };
        saveBudgetPreferences(next.budgetPreferences);
        return next;
      });
      setHideLevel3ToastVisible(true);
    };
    window.addEventListener(WTR_HIDE_LEVEL3_CAUTIONS_EVENT, onHideLevel3);
    return () =>
      window.removeEventListener(WTR_HIDE_LEVEL3_CAUTIONS_EVENT, onHideLevel3);
  }, []);

  useEffect(() => {
    setExplorationIncome(defaultExplorationIncome(grossMonthlyIncome));
  }, [grossMonthlyIncome]);

  const activeFilterCount = useMemo(
    () =>
      countActiveMapFilters(mapFilters) +
      (isAtProjectedExplorationIncome(grossMonthlyIncome, explorationIncome)
        ? 0
        : 1) +
      (hasNonDefaultUserExclusions(storage.excludedCountryEntries) ? 1 : 0),
    [
      grossMonthlyIncome,
      explorationIncome,
      mapFilters,
      storage.excludedCountryEntries,
    ],
  );

  const toggleFiltersPanel = useCallback(() => {
    if (drawerOpen) {
      closeDrawer();
      return;
    }
    openDrawerTab("filters");
  }, [drawerOpen, closeDrawer, openDrawerTab]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    notifyMapLayout();
  }, [drawerOpen, notifyMapLayout]);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    setBaselineCity(null);
  }, []);

  const removeCompare = useCallback((cityId: string) => {
    setCompareIds((prev) => prev.filter((id) => id !== cityId));
  }, []);

  const handlePreferencesComplete = useCallback(
    (next: typeof prefs) => {
      setPrefs(next);
      setPreferencesWizardOpen(false);
      setPrefsUpdatedFlash(true);
      window.setTimeout(() => setPrefsUpdatedFlash(false), 4200);
    },
    [setPrefs],
  );

  const syncPreferencesWizardOpen = useCallback(() => {
    setPreferencesWizardOpen(!hasRetirementPreferences());
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    reloadPrefs();
    syncPreferencesWizardOpen();
  }, [isHydrated, reloadPrefs, syncPreferencesWizardOpen]);

  useEffect(() => {
    if (!hasSavedPrefs) return;
    setPreferencesWizardOpen(false);
  }, [hasSavedPrefs]);

  useEffect(() => {
    const onPreferencesUpdated = () => {
      reloadPrefs();
      setPreferencesWizardOpen(!hasRetirementPreferences());
    };
    const onPlanStateHydrated = () => {
      reloadPrefs();
      syncPreferencesWizardOpen();
    };
    window.addEventListener("retirement-preferences-updated", onPreferencesUpdated);
    window.addEventListener(PLAN_STATE_SERVER_HYDRATED_EVENT, onPlanStateHydrated);
    return () => {
      window.removeEventListener("retirement-preferences-updated", onPreferencesUpdated);
      window.removeEventListener(PLAN_STATE_SERVER_HYDRATED_EVENT, onPlanStateHydrated);
    };
  }, [reloadPrefs, syncPreferencesWizardOpen]);

  useEffect(() => {
    const onOpenWizard = () => openPreferencesWizard();
    const onOpenPreferencesCrossRef = (event: Event) => {
      openPreferencesWizard(
        (event as CustomEvent<WtrOpenPreferencesDetail>).detail,
      );
    };
    const onOpenFiltersCrossRef = (event: Event) => {
      openFiltersFromCrossRef(
        (event as CustomEvent<WtrOpenFiltersDetail>).detail,
      );
    };
    window.addEventListener("retirement-preferences-open-wizard", onOpenWizard);
    window.addEventListener(WTR_OPEN_PREFERENCES_EVENT, onOpenPreferencesCrossRef);
    window.addEventListener(WTR_OPEN_FILTERS_EVENT, onOpenFiltersCrossRef);
    return () => {
      window.removeEventListener("retirement-preferences-open-wizard", onOpenWizard);
      window.removeEventListener(
        WTR_OPEN_PREFERENCES_EVENT,
        onOpenPreferencesCrossRef,
      );
      window.removeEventListener(WTR_OPEN_FILTERS_EVENT, onOpenFiltersCrossRef);
    };
  }, [openPreferencesWizard, openFiltersFromCrossRef]);

  return (
    <div className="where-to-retire">
      <div className="main main--has-hero main--where-to-retire">
        <div
          className={[
            "section",
            "section--tax-summary",
            "section--tax-summary--where-to-retire",
            drawerOpen && "section--tax-summary--where-to-retire--drawer-open",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="section--tax-summary__income-layout">
            <div className="where-to-retire__mobile-back where-to-retire__main-panel-back">
              <button
                type="button"
                className="app-page-back where-to-retire__panel-back"
                onClick={() => navigateApp(APP_DASHBOARD_PATH)}
              >
                <IconArrowLeft size={16} stroke={1.5} aria-hidden />
                Back to dashboard
              </button>
            </div>
            <div
              className={[
                "portfolio-accounts-reveal",
                "portfolio-accounts-reveal--in",
                "where-to-retire__main",
                drawerOpen && "where-to-retire__main--drawer-open",
                viewMode === "compare" && "where-to-retire__main--compare-open",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="where-to-retire__main-panel-map">
                <div className="where-to-retire__map-stage">
                  <RetirementMapExplorer
                    explorationIncome={mapExplorationIncome}
                    planMonthlyIncome={grossMonthlyIncome}
                    filters={mapFilters}
                    preferences={prefs}
                    onFiltersChange={handleMapFiltersChange}
                    pinColorView={pinColorView}
                    onPinColorViewChange={handlePinColorViewChange}
                    excludedCountries={storage.excludedCountries}
                    excludedCountryEntries={storage.excludedCountryEntries}
                    isFavoritedCity={storage.isFavoritedCity}
                    onToggleFavoriteCity={storage.toggleFavoriteCity}
                    favoriteCities={storage.favoriteCities}
                    filtersOpen={drawerOpen}
                    onFiltersOpenChange={(open) => {
                      if (!open) closeDrawer();
                    }}
                    drawerTab={drawerTab}
                    onDrawerTabChange={setDrawerTab}
                    onAddExcludedCountry={storage.addExcludedCountry}
                    onRemoveExcludedCountry={storage.removeExcludedCountry}
                    onRemoveFavorite={storage.removeFavoriteCity}
                    compareIds={compareIds}
                    compareOverlayOpen={viewMode === "compare"}
                    explorerViewMode={viewMode === "compare" ? "compare" : "map"}
                    onExplorerViewModeChange={(mode) =>
                      setViewMode(mode === "compare" ? "compare" : "map")
                    }
                    onClearCompare={clearCompare}
                    onViewComparison={() => setViewMode("compare")}
                    onDetailPanelOpenChange={setDetailPanelOpen}
                    onBackToDashboard={() => navigateApp(APP_DASHBOARD_PATH)}
                    filterCrossRefHighlight={filterCrossRefHighlight}
                    onFilterCrossRefHighlightClear={() =>
                      setFilterCrossRefHighlight(null)
                    }
                  />
                  {viewMode === "compare" ? (
                    <div
                      className="where-to-retire__compare-overlay"
                      role="dialog"
                      aria-modal="true"
                      aria-label="City comparison"
                    >
                      <WtrComparisonTableView
                        monthlyIncome={mapExplorationIncome}
                        compareIds={compareIds}
                        baselineCity={baselineCity}
                        onBaselineCityChange={setBaselineCity}
                        onBackToMap={() => setViewMode("map")}
                        onClearAll={clearCompare}
                        onRemoveCompare={removeCompare}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

            </div>

            <div
              className={[
                "section--tax-summary__sidebar",
                "where-to-retire__sidebar",
                detailPanelOpen && "section--tax-summary__sidebar--detail-open",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <WtrFiltersSidebar
                planMonthlyIncome={grossMonthlyIncome}
                explorationIncome={explorationIncome}
                onExplorationIncomeChange={setExplorationIncome}
                pinColorView={pinColorView}
                filters={mapFilters}
                onFiltersChange={handleMapFiltersChange}
                activeFilterCount={activeFilterCount}
                filtersOpen={drawerOpen}
                onToggleFilters={toggleFiltersPanel}
                filterButtonRef={filterButtonRef}
                onOpenBudgetTab={() => openDrawerTab("budget")}
                onOpenPreferences={() => openPreferencesWizard()}
                onClosePreferences={() => setPreferencesWizardOpen(false)}
                preferencesOpen={preferencesWizardOpen}
                preferencesUpdatedFlash={prefsUpdatedFlash}
              />
            </div>
          </div>
        </div>
      </div>

      <PreferencesWizardModal
        open={preferencesWizardOpen}
        onClose={() => {
          setPreferencesWizardOpen(false);
          setPreferencesScrollFactorId(null);
        }}
        initialValues={prefs}
        onComplete={handlePreferencesComplete}
        placement="map-rail"
        allowDismiss={hasRetirementPreferences()}
        initialWizardStep={preferencesInitialStep}
        scrollToFactorId={preferencesScrollFactorId}
        mapFilters={mapFilters}
      />
      <AppToast
        message={HIDE_LEVEL3_CAUTIONS_TOAST_MESSAGE}
        visible={hideLevel3ToastVisible}
        onDismiss={() => setHideLevel3ToastVisible(false)}
        placement="corner"
        durationMs={3500}
      />
    </div>
  );
}
