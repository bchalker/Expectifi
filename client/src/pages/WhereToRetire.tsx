import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { AppToast } from "../components/ui/AppToast";
import { PreferencesWizardModal } from "../components/preferences/PreferencesWizardModal";
import { RetirementMapExplorer } from "../components/whereToRetire/RetirementMapExplorer";
import { WtrFiltersSidebar } from "../components/whereToRetire/WtrFiltersSidebar";
import { RetirementMapFilters } from "../components/whereToRetire/RetirementMapFilters";
import { WtrComparisonTableView } from "../components/whereToRetire/WtrComparisonTableView";
import type { ComputedSnapshot } from "../lib/computeResults";
import { APP_DASHBOARD_PATH, navigateApp } from "../lib/appPaths";
import {
  ALL_DESTINATION_REGIONS,
  countActiveMapFilters,
  countMapCityVisibility,
  DEFAULT_MAP_FILTERS,
  type MapFilters,
} from "../lib/whereToRetire/cityMapScoring";
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
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
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
  const [mapFilters, setMapFilters] = useState<MapFilters>(() => ({
    ...DEFAULT_MAP_FILTERS,
    regions: [...ALL_DESTINATION_REGIONS],
  }));
  const { pinColorView, handlePinColorViewChange } = useWtrMapPinColorView(
    mapFilters,
    setMapFilters,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setExplorationIncome(defaultExplorationIncome(grossMonthlyIncome));
  }, [grossMonthlyIncome]);

  const visibilityCounts = useMemo(
    () =>
      countMapCityVisibility(
        mapExplorationIncome,
        mapFilters,
        storage.excludedCountries,
      ),
    [mapExplorationIncome, mapFilters, storage.excludedCountries],
  );

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
    setFiltersOpen((open) => !open);
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    window.setTimeout(() => window.dispatchEvent(new Event("resize")), 340);
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);

  useEffect(() => {
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    const id = window.setTimeout(
      () => window.dispatchEvent(new Event("resize")),
      340,
    );
    return () => window.clearTimeout(id);
  }, [filtersOpen]);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    setBaselineCity(null);
  }, []);

  const removeCompare = useCallback((cityId: string) => {
    setCompareIds((prev) => prev.filter((id) => id !== cityId));
  }, []);

  const showPreferencesToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  }, []);

  const handlePreferencesComplete = useCallback(
    (next: typeof prefs) => {
      setPrefs(next);
      setPreferencesWizardOpen(false);
      showPreferencesToast("Map scored for your priorities");
    },
    [setPrefs, showPreferencesToast],
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
        <div className="section section--tax-summary section--tax-summary--where-to-retire">
          <div className="section--tax-summary__income-layout">
            <div
              className={[
                "portfolio-accounts-reveal",
                "portfolio-accounts-reveal--in",
                "where-to-retire__main",
                viewMode === "compare" && "where-to-retire__main--compare-open",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="where-to-retire__main-panel-back">
                <button
                  type="button"
                  className="app-page-back where-to-retire__panel-back"
                  onClick={() => navigateApp(APP_DASHBOARD_PATH)}
                >
                  <IconArrowLeft size={16} stroke={1.5} aria-hidden />
                  Back to dashboard
                </button>
              </div>

              <div className="where-to-retire__main-panel-map">
                <div className="where-to-retire__map-stage">
                  <RetirementMapExplorer
                    explorationIncome={mapExplorationIncome}
                    filters={mapFilters}
                    preferences={prefs}
                    onFiltersChange={setMapFilters}
                    pinColorView={pinColorView}
                    excludedCountries={storage.excludedCountries}
                    isFavoritedCity={storage.isFavoritedCity}
                    onToggleFavoriteCity={storage.toggleFavoriteCity}
                    favoriteCities={storage.favoriteCities}
                    filtersOpen={filtersOpen}
                    onFiltersOpenChange={setFiltersOpen}
                    compareIds={compareIds}
                    compareOverlayOpen={viewMode === "compare"}
                    explorerViewMode={viewMode === "compare" ? "compare" : "map"}
                    onExplorerViewModeChange={(mode) =>
                      setViewMode(mode === "compare" ? "compare" : "map")
                    }
                    onClearCompare={clearCompare}
                    onViewComparison={() => setViewMode("compare")}
                    onDetailPanelOpenChange={setDetailPanelOpen}
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

              <footer
                className="where-to-retire__main-panel-footer font-xs"
                role="note"
              >
                All figures are educational estimates only — not tax, legal,
                financial, or immigration advice. Consult qualified professionals
                before relocating. Sources:{" "}
                <a
                  href="https://www.irs.gov/individuals/international-taxpayers"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  IRS
                </a>
                {" · "}
                <a
                  href="https://taxfoundation.org/data/all/state/state-income-tax-rates/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Tax Foundation
                </a>
              </footer>
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
                visibilityCounts={visibilityCounts}
                pinColorView={pinColorView}
                onPinColorViewChange={handlePinColorViewChange}
                filters={mapFilters}
                onFiltersChange={setMapFilters}
                activeFilterCount={activeFilterCount}
                filtersOpen={filtersOpen}
                onToggleFilters={toggleFiltersPanel}
                filterButtonRef={filterButtonRef}
                onOpenPreferences={() => setPreferencesWizardOpen(true)}
              />
              <RetirementMapFilters
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                filters={mapFilters}
                onChange={setMapFilters}
                monthlyIncome={mapExplorationIncome}
                excludedCountries={storage.excludedCountries}
                favoriteCities={storage.favoriteCities}
                onAddExcludedCountry={storage.addExcludedCountry}
                onRemoveExcludedCountry={storage.removeExcludedCountry}
                onClearExcludedCountries={storage.clearExcludedCountries}
                onRemoveFavorite={storage.removeFavoriteCity}
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
      />
      <AppToast
        message={toastMessage}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />
    </div>
  );
}
