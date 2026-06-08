import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { AnimatedCount } from "../components/ui/AnimatedCount";
import { BudgetExplorationHero } from "../components/whereToRetire/BudgetExplorationHero";
import { RetirementMapExplorer } from "../components/whereToRetire/RetirementMapExplorer";
import { WtrIncomeToolbarMapSelects } from "../components/whereToRetire/WtrIncomeToolbarMapSelects";
import { WtrMapWaveDivider } from "../components/whereToRetire/WtrMapWaveDivider";
import { WtrMapFilterButton } from "../components/whereToRetire/WtrMapFilterButton";
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
import { useStickySentinel } from "../hooks/useStickySentinel";
import { useWtrMapPinColorView } from "../hooks/useWtrMapPinColorView";
import type { MapCity } from "../utils/costOfLiving";
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
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [toolbarStickyEnabled, setToolbarStickyEnabled] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 681px)").matches
      : false,
  );
  const { heroRef: toolbarRowRef, stuck: toolbarRowStuck } = useStickySentinel(
    null,
    toolbarStickyEnabled,
  );

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

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 681px)");
    const sync = () => setToolbarStickyEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    setBaselineCity(null);
  }, []);

  const removeCompare = useCallback((cityId: string) => {
    setCompareIds((prev) => prev.filter((id) => id !== cityId));
  }, []);

  return (
    <div className="where-to-retire">
      <div
        className={[
          "where-to-retire__body",
          "main",
          "app-page",
          "app-page--where-to-retire",
          "where-to-retire__body--map",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={[
            "where-to-retire__main-panel",
            viewMode === "compare" &&
              "where-to-retire__main-panel--compare-open",
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
          <section
            className="where-to-retire__income-intro"
            aria-labelledby="wtr-budget-hero-title"
          >
            <BudgetExplorationHero
              section="intro"
              planMonthlyIncome={grossMonthlyIncome}
              explorationIncome={explorationIncome}
              onExplorationIncomeChange={setExplorationIncome}
            />
          </section>
          <div className="where-to-retire__income-toolbar">
            <WtrMapWaveDivider />
          </div>
          <div
            ref={toolbarRowRef}
            className={[
              "where-to-retire__income-toolbar-row",
              toolbarRowStuck && "where-to-retire__income-toolbar-row--stuck",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="where-to-retire__income-toolbar-meta">
              <div className="where-to-retire__income-toolbar-label">
                <BudgetExplorationHero
                  section="slider-label"
                  planMonthlyIncome={grossMonthlyIncome}
                  explorationIncome={explorationIncome}
                  onExplorationIncomeChange={setExplorationIncome}
                />
              </div>
              <div
                className="where-to-retire__showing-count"
                aria-live="polite"
              >
                <p className="where-to-retire__showing-count-line font-xs">
                  <span className="where-to-retire__showing-count-primary">
                    <AnimatedCount
                      value={visibilityCounts.visibleCount}
                      className="where-to-retire__showing-count-num"
                    />{" "}
                    cities
                  </span>{" "}
                  <span className="where-to-retire__showing-count-sub">
                    from{" "}
                    <AnimatedCount
                      value={visibilityCounts.visibleCountryCount}
                      className="where-to-retire__showing-count-num where-to-retire__showing-count-num--sub"
                    />{" "}
                    countries
                  </span>
                </p>
              </div>
            </div>
            <WtrIncomeToolbarMapSelects
              pinColorView={pinColorView}
              onPinColorViewChange={handlePinColorViewChange}
              filters={mapFilters}
              onFiltersChange={setMapFilters}
            />
            <div className="where-to-retire__income-toolbar-slider where-to-retire__income-toolbar-slider--mobile">
              <BudgetExplorationHero
                section="slider-rail"
                planMonthlyIncome={grossMonthlyIncome}
                explorationIncome={explorationIncome}
                onExplorationIncomeChange={setExplorationIncome}
              />
            </div>
            <div className="where-to-retire__income-toolbar-slider where-to-retire__income-toolbar-slider--desktop">
              <BudgetExplorationHero
                section="slider"
                planMonthlyIncome={grossMonthlyIncome}
                explorationIncome={explorationIncome}
                onExplorationIncomeChange={setExplorationIncome}
              />
            </div>
            <div className="where-to-retire__income-toolbar-actions">
              <WtrMapFilterButton
                ref={filterButtonRef}
                active={activeFilterCount > 0}
                activeFilterCount={activeFilterCount}
                filtersOpen={filtersOpen}
                onToggle={toggleFiltersPanel}
              />
            </div>
          </div>
          <div className="where-to-retire__main-panel-map">
            <div className="where-to-retire__map-stage">
              <RetirementMapExplorer
                explorationIncome={mapExplorationIncome}
                filters={mapFilters}
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
      </div>
    </div>
  );
}
