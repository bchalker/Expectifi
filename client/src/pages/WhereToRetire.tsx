import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PreferencesWizardModal } from "../components/preferences/PreferencesWizardModal";
import { RetirementMapExplorer } from "../components/whereToRetire/RetirementMapExplorer";
import { WtrFiltersSidebar } from "../components/whereToRetire/WtrFiltersSidebar";
import type { MapOptionsPanelTab } from "../components/whereToRetire/RetirementMapFilters";
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
import { hasRetirementPreferences } from "../types/preferences";
import { useWtrMapPinColorView } from "../hooks/useWtrMapPinColorView";
import type { MapCity } from "../utils/costOfLiving";
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
  const { prefs, setPrefs, reloadPrefs } = useRetirementPreferences();
  const [preferencesWizardOpen, setPreferencesWizardOpen] = useState(
    () => !hasRetirementPreferences(),
  );
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
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const notifyMapLayout = useCallback(() => {
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 340);
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
    setExplorationIncome(defaultExplorationIncome(grossMonthlyIncome));
  }, [grossMonthlyIncome]);

  const activeFilterCount = useMemo(
    () =>
      countActiveMapFilters(mapFilters) +
      (isAtProjectedExplorationIncome(grossMonthlyIncome, explorationIncome)
        ? 0
        : 1) +
      (storage.excludedCountries.length > 0 ? 1 : 0),
    [
      grossMonthlyIncome,
      explorationIncome,
      mapFilters,
      storage.excludedCountries.length,
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

  useEffect(() => {
    const onPreferencesUpdated = () => reloadPrefs();
    window.addEventListener("retirement-preferences-updated", onPreferencesUpdated);
    return () =>
      window.removeEventListener("retirement-preferences-updated", onPreferencesUpdated);
  }, [reloadPrefs]);

  useEffect(() => {
    const onOpenWizard = () => setPreferencesWizardOpen(true);
    window.addEventListener("retirement-preferences-open-wizard", onOpenWizard);
    return () =>
      window.removeEventListener("retirement-preferences-open-wizard", onOpenWizard);
  }, []);

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
                    excludedCountries={storage.excludedCountries}
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
                    onClearExcludedCountries={storage.clearExcludedCountries}
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
                onPinColorViewChange={handlePinColorViewChange}
                filters={mapFilters}
                onFiltersChange={handleMapFiltersChange}
                activeFilterCount={activeFilterCount}
                filtersOpen={drawerOpen}
                onToggleFilters={toggleFiltersPanel}
                filterButtonRef={filterButtonRef}
                onOpenBudgetTab={() => openDrawerTab("budget")}
                onOpenPreferences={() => setPreferencesWizardOpen(true)}
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
        onClose={() => setPreferencesWizardOpen(false)}
        initialValues={prefs}
        onComplete={handlePreferencesComplete}
        placement="map-rail"
      />
    </div>
  );
}
