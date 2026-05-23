import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconChevronLeft, IconChevronRight, IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import { AnimatedCount } from "../ui/AnimatedCount";
import {
  applyWhereToLook,
  resolveWhereToLook,
  scoreAndFilterMapCities,
  EXPAT_LEGEND_TIER_IDS,
  type MapFilters,
  type ScoredMapCity,
} from "../../lib/whereToRetire/cityMapScoring";
import { lookupRetirementCity } from "../../lib/whereToRetire/retirementCityLookup";
import { countryToIsoCode } from "../../utils/costOfLiving";
import { expatCommunitySortRank } from "../../utils/expatInfo";
import type { MapPinColorView } from "../../lib/whereToRetire/mapPinDisplay";
import { RetirementDestinationCard } from "./RetirementDestinationCard";
import { RetirementDestinationPanel } from "./RetirementDestinationPanel";
import { WtrCompareBar, type CompareBarCity } from "./WtrCompareBar";
import {
  mapIncomeFitDisplayForCity,
  monthlyOutflowForMapCity,
} from "../../lib/whereToRetire/mapIncomeFit";
import { resolveCompareScored } from "../../hooks/useWtrComparisonColumns";
import { useMapPinColorView } from "../../hooks/useMapPinColorView";
import { RetirementLeafletMap } from "./RetirementLeafletMap";
import { WtrMapPinColorChrome } from "./WtrMapPinColorChrome";
import { WtrMapSortSelect } from "./RetirementMapFilters";
import { WtrCityListPagination } from "./WtrCityListPagination";
import "./RetirementMapExplorer.scss";
import "./WtrMapPinColorChrome.scss";

export type WtrExplorerViewMode = "map" | "compare";

type Props = {
  /** Resolved income for map pins, scores, and list (slider value). */
  explorationIncome: number;
  filters: MapFilters;
  onFiltersChange: (
    next: MapFilters | ((prev: MapFilters) => MapFilters),
  ) => void;
  headerSlot?: ReactNode;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  compareIds: string[];
  compareOverlayOpen?: boolean;
  explorerViewMode: WtrExplorerViewMode;
  onExplorerViewModeChange: (mode: WtrExplorerViewMode) => void;
  onToggleCompare: (cityId: string) => void;
  onClearCompare: () => void;
  onViewComparison: () => void;
  excludedCountries: string[];
  onAddExcludedCountry: (country: string) => void;
  favoriteCities: { city: string; country: string }[];
  isFavoritedCity: (city: string, country: string) => boolean;
  onToggleFavoriteCity: (entry: {
    city: string;
    country: string;
    country_iso: string;
  }) => void;
};

const LIST_PAGE_SIZE = 25;

function notifyMapResize() {
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  window.setTimeout(() => window.dispatchEvent(new Event("resize")), 340);
}

const MAX_COMPARE_CITIES = 5;

function sortCitiesForPinView(
  cities: ScoredMapCity[],
  pinColorView: MapPinColorView,
  monthlyIncome: number,
  filters: Pick<MapFilters, "includeHealthIns" | "healthInsMonthlyUsd">,
  expatSortDescending = true,
  budgetSortDescending = false,
): ScoredMapCity[] {
  if (pinColorView === "expat") {
    const expatDelta = expatSortDescending
      ? (a: ScoredMapCity, b: ScoredMapCity) =>
          expatCommunitySortRank(b.city.country) -
          expatCommunitySortRank(a.city.country)
      : (a: ScoredMapCity, b: ScoredMapCity) =>
          expatCommunitySortRank(a.city.country) -
          expatCommunitySortRank(b.city.country);

    return [...cities].sort(
      (a, b) => expatDelta(a, b) || b.retirementScore - a.retirementScore,
    );
  }
  if (pinColorView === "budget") {
    const budgetDelta = budgetSortDescending
      ? (a: ScoredMapCity, b: ScoredMapCity) =>
          monthlyOutflowForMapCity(b, monthlyIncome, filters) -
          monthlyOutflowForMapCity(a, monthlyIncome, filters)
      : (a: ScoredMapCity, b: ScoredMapCity) =>
          monthlyOutflowForMapCity(a, monthlyIncome, filters) -
          monthlyOutflowForMapCity(b, monthlyIncome, filters);

    return [...cities].sort(
      (a, b) => budgetDelta(a, b) || b.retirementScore - a.retirementScore,
    );
  }
  return cities;
}

export function RetirementMapExplorer({
  explorationIncome,
  filters,
  onFiltersChange,
  headerSlot,
  filtersOpen,
  onFiltersOpenChange,
  compareIds,
  compareOverlayOpen = false,
  explorerViewMode,
  onExplorerViewModeChange,
  onToggleCompare,
  onClearCompare,
  onViewComparison,
  excludedCountries,
  onAddExcludedCountry,
  favoriteCities,
  isFavoritedCity,
  onToggleFavoriteCity,
}: Props) {
  const { pinColorView, onPinColorViewChange } = useMapPinColorView();

  const favoritedKeySet = useMemo(
    () =>
      new Set(
        favoriteCities.map((f) => `${f.city}\u0001${f.country}`),
      ),
    [favoriteCities],
  );

  const handlePinColorViewChange = useCallback(
    (view: MapPinColorView) => {
      onPinColorViewChange(view);
      if (view === "expat") {
        onFiltersChange((prev) => {
          const base =
            resolveWhereToLook(prev) === "us"
              ? applyWhereToLook(prev, "all")
              : prev;
          return base.regionScope === "both"
            ? { ...base, regionScope: "international-only" }
            : base;
        });
      }
      if (view === "budget" && filters.sortBy !== "lowest-budget") {
        onFiltersChange((prev) => ({ ...prev, sortBy: "lowest-budget" }));
      }
      if (view !== "expat") {
        onFiltersChange((prev) => ({
          ...prev,
          expatCommunityTiers: [...EXPAT_LEGEND_TIER_IDS],
        }));
      }
    },
    [onPinColorViewChange, onFiltersChange, filters.sortBy],
  );

  useEffect(() => {
    if (pinColorView !== "expat" || filters.regionScope !== "both") return;
    onFiltersChange((prev) => {
      const base =
        resolveWhereToLook(prev) === "us"
          ? applyWhereToLook(prev, "all")
          : prev;
      return base.regionScope === "both"
        ? { ...base, regionScope: "international-only" }
        : base;
    });
  }, [pinColorView, filters.regionScope, onFiltersChange]);

  useEffect(() => {
    if (filters.whereToLook !== "us" || pinColorView !== "expat") return;
    onPinColorViewChange("score");
  }, [filters.whereToLook, pinColorView, onPinColorViewChange]);

  const chromeRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [listPanelOpen, setListPanelOpen] = useState(true);
  const [listPage, setListPage] = useState(0);
  const [expatSortDescending, setExpatSortDescending] = useState(true);
  const [budgetSortDescending, setBudgetSortDescending] = useState(false);
  const baseFilteredCities = useMemo(
    () =>
      scoreAndFilterMapCities(
        explorationIncome,
        filters,
        undefined,
        excludedCountries,
      ),
    [explorationIncome, filters, excludedCountries],
  );

  const filteredCities = useMemo(
    () =>
      sortCitiesForPinView(
        baseFilteredCities,
        pinColorView,
        explorationIncome,
        filters,
        expatSortDescending,
        budgetSortDescending,
      ),
    [
      baseFilteredCities,
      pinColorView,
      explorationIncome,
      filters,
      expatSortDescending,
      budgetSortDescending,
    ],
  );

  /** Expat list ranks stay fixed (largest community = 1) when sort direction toggles. */
  const expatRankByCityId = useMemo(() => {
    if (pinColorView !== "expat") return null;
    const ranked = sortCitiesForPinView(
      baseFilteredCities,
      "expat",
      explorationIncome,
      filters,
      true,
    );
    const map = new Map<string, number>();
    ranked.forEach((item, index) => {
      map.set(item.city.id, index + 1);
    });
    return map;
  }, [baseFilteredCities, pinColorView, explorationIncome, filters]);

  const listPageCount = useMemo(
    () => Math.max(1, Math.ceil(filteredCities.length / LIST_PAGE_SIZE)),
    [filteredCities.length],
  );

  const safeListPage = Math.min(listPage, listPageCount - 1);

  const listCities = useMemo(() => {
    const start = safeListPage * LIST_PAGE_SIZE;
    return filteredCities.slice(start, start + LIST_PAGE_SIZE);
  }, [filteredCities, safeListPage]);

  const compareBarCities = useMemo<CompareBarCity[]>(
    () =>
      resolveCompareScored(compareIds, explorationIncome).map((scored) => ({
        id: scored.city.id,
        name: `${scored.city.city}, ${scored.city.country}`,
      })),
    [compareIds, explorationIncome],
  );

  const structuralFiltersKey = useMemo(
    () =>
      [
        explorationIncome,
        filters.fitsMyIncome ? "1" : "0",
        filters.climate,
        filters.whereToLook,
        [...filters.regions].sort().join(","),
        filters.regionScope,
        filters.sortBy,
        filters.englishProficiency,
        filters.foreignTax,
        filters.retirementVisa ? "1" : "0",
        filters.medicareAccess ? "1" : "0",
        filters.hideAdvisories ? "1" : "0",
        filters.safety,
        filters.healthcare,
        filters.goodAirOnly ? "1" : "0",
        filters.maxFlightTime,
        filters.directFromUsOnly ? "1" : "0",
        filters.directFlightOrigin,
        filters.visaFreeDays,
        filters.minRetirementScore,
        filters.includeHealthIns ? "1" : "0",
        String(filters.healthInsMonthlyUsd),
        filters.visaQualifyingOnly ? "1" : "0",
        pinColorView,
        excludedCountries.join(","),
      ].join("|"),
    [
      explorationIncome,
      filters.climate,
      filters.whereToLook,
      filters.englishProficiency,
      filters.foreignTax,
      filters.safety,
      filters.healthcare,
      filters.goodAirOnly,
      filters.maxFlightTime,
      filters.directFromUsOnly,
      filters.directFlightOrigin,
      filters.visaFreeDays,
      filters.minRetirementScore,
      filters.includeHealthIns,
      filters.healthInsMonthlyUsd,
      filters.visaQualifyingOnly,
      filters.fitsMyIncome,
      filters.hideAdvisories,
      filters.medicareAccess,
      filters.regionScope,
      filters.regions,
      filters.retirementVisa,
      filters.sortBy,
      pinColorView,
      excludedCountries,
    ],
  );

  const listCardsRef = useRef<HTMLDivElement>(null);
  const listBodyRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setListPage(0);
  }, [structuralFiltersKey]);

  useEffect(() => {
    if (explorerViewMode === "compare" && compareIds.length === 0) {
      onExplorerViewModeChange("map");
    }
  }, [compareIds.length, explorerViewMode, onExplorerViewModeChange]);

  useEffect(() => {
    setListPage((page) => Math.min(page, Math.max(0, listPageCount - 1)));
  }, [listPageCount]);

  useEffect(() => {
    const el = listCardsRef.current;
    if (!el) return;
    el.classList.remove("wtr-explorer__list-cards--refresh");
    void el.offsetHeight;
    el.classList.add("wtr-explorer__list-cards--refresh");
  }, [structuralFiltersKey, safeListPage]);

  useEffect(() => {
    if (!selectedId) return;
    if (!filteredCities.some((item) => item.city.id === selectedId)) {
      setSelectedId(null);
      setPanelOpen(false);
    }
  }, [filteredCities, selectedId]);

  const selectedScored = useMemo(
    () => filteredCities.find((s) => s.city.id === selectedId) ?? null,
    [filteredCities, selectedId],
  );

  const handleExcludeCountry = useCallback(
    (country: string) => {
      onAddExcludedCountry(country);
      if (selectedScored?.city.country === country) {
        setSelectedId(null);
        setPanelOpen(false);
      }
    },
    [onAddExcludedCountry, selectedScored?.city.country],
  );

  const scrollListToTop = useCallback(() => {
    listScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const changeListPage = useCallback(
    (page: number) => {
      const pageCount = Math.max(
        1,
        Math.ceil(filteredCities.length / LIST_PAGE_SIZE),
      );
      const safePage = Math.max(0, Math.min(page, pageCount - 1));
      setListPage(safePage);
      scrollListToTop();
      const start = safePage * LIST_PAGE_SIZE;
      const pageIds = new Set(
        filteredCities
          .slice(start, start + LIST_PAGE_SIZE)
          .map((item) => item.city.id),
      );
      if (selectedId != null && !pageIds.has(selectedId)) {
        setSelectedId(null);
        setPanelOpen(false);
      }
    },
    [filteredCities, scrollListToTop, selectedId],
  );

  const goToListPage = useCallback(
    (page: number) => {
      const pageCount = Math.max(
        1,
        Math.ceil(filteredCities.length / LIST_PAGE_SIZE),
      );
      const safePage = Math.max(0, Math.min(page, pageCount - 1));
      setListPage(safePage);
      scrollListToTop();
      const firstOnPage = filteredCities[safePage * LIST_PAGE_SIZE];
      if (firstOnPage) {
        setSelectedId(firstOnPage.city.id);
        setPanelOpen(true);
      }
    },
    [filteredCities, scrollListToTop],
  );

  const destinationListPageNav = useMemo(() => {
    if (filteredCities.length <= LIST_PAGE_SIZE) return null;
    return {
      page: safeListPage,
      pageSize: LIST_PAGE_SIZE,
      totalCount: filteredCities.length,
      onPageChange: goToListPage,
    };
  }, [filteredCities.length, goToListPage, safeListPage]);

  const openDestination = useCallback(
    (id: string) => {
      setSelectedId(id);
      setPanelOpen(true);
      const index = filteredCities.findIndex((s) => s.city.id === id);
      if (index >= 0) setListPage(Math.floor(index / LIST_PAGE_SIZE));
    },
    [filteredCities],
  );

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const collapseListPanel = useCallback(() => {
    setListPanelOpen(false);
  }, []);

  const expandListPanel = useCallback(() => {
    setListPanelOpen(true);
  }, []);

  const closeFiltersPanel = useCallback(() => {
    onFiltersOpenChange(false);
    notifyMapResize();
  }, [onFiltersOpenChange]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFiltersPanel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen, closeFiltersPanel]);

  return (
    <div className="wtr-explorer">
      <div ref={chromeRef} className="wtr-explorer__chrome">
        {headerSlot ? (
          <div className="wtr-explorer__chrome-slot">{headerSlot}</div>
        ) : null}
        <WtrMapPinColorChrome
          pinColorView={pinColorView}
          onPinColorViewChange={handlePinColorViewChange}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      </div>

      <div
        className={[
          "wtr-explorer__map-row",
          !listPanelOpen && "wtr-explorer__map-row--list-collapsed",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="wtr-explorer__map-stage">
          <RetirementLeafletMap
            destinations={filteredCities}
            monthlyIncome={explorationIncome}
            pinColorView={pinColorView}
            filters={filters}
            onFiltersChange={onFiltersChange}
            favoritedKeySet={favoritedKeySet}
            selectedId={selectedId}
            detailPanelOpen={panelOpen && selectedScored != null}
            fitKey={structuralFiltersKey}
            onSelect={openDestination}
          />
        </div>

        <aside
          id="wtr-explorer-list-panel"
          className="wtr-explorer__list-panel"
          aria-label="City list"
          aria-hidden={!listPanelOpen}
        >
          {listPanelOpen ? (
            <button
              type="button"
              className="wtr-explorer__list-collapse"
              aria-expanded={listPanelOpen}
              aria-controls="wtr-explorer-list-panel"
              aria-label="Hide city list"
              onClick={collapseListPanel}
            >
              <IconChevronLeft size={18} stroke={1.5} aria-hidden />
            </button>
          ) : null}
          <div className="wtr-explorer__list-panel-inner">
            <header className="wtr-explorer__list-head">
              {pinColorView === "expat" ? (
                <button
                  type="button"
                  className="wtr-explorer__list-sort-control"
                  aria-label={
                    expatSortDescending
                      ? "Sort by expat community size, largest first. Click to sort smallest first."
                      : "Sort by expat community size, smallest first. Click to sort largest first."
                  }
                  onClick={() => {
                    setExpatSortDescending((prev) => !prev);
                    setListPage(0);
                  }}
                >
                  <span className="wtr-explorer__list-sort-label">
                    Sort by expat community size
                  </span>
                  {expatSortDescending ? (
                    <IconSortDescending
                      className="wtr-explorer__list-sort-icon"
                      size={18}
                      stroke={1.5}
                      aria-hidden
                    />
                  ) : (
                    <IconSortAscending
                      className="wtr-explorer__list-sort-icon"
                      size={18}
                      stroke={1.5}
                      aria-hidden
                    />
                  )}
                </button>
              ) : pinColorView === "budget" ? (
                <button
                  type="button"
                  className="wtr-explorer__list-sort-control"
                  aria-label={
                    budgetSortDescending
                      ? "Sort by monthly cost, highest first. Click to sort lowest first."
                      : "Sort by monthly cost, lowest first. Click to sort highest first."
                  }
                  onClick={() => {
                    setBudgetSortDescending((prev) => !prev);
                    setListPage(0);
                  }}
                >
                  <span className="wtr-explorer__list-sort-label">
                    Sort by monthly cost
                  </span>
                  {budgetSortDescending ? (
                    <IconSortDescending
                      className="wtr-explorer__list-sort-icon"
                      size={18}
                      stroke={1.5}
                      aria-hidden
                    />
                  ) : (
                    <IconSortAscending
                      className="wtr-explorer__list-sort-icon"
                      size={18}
                      stroke={1.5}
                      aria-hidden
                    />
                  )}
                </button>
              ) : (
                <WtrMapSortSelect
                  className="wtr-map-filters__sort-select--list-head"
                  filters={filters}
                  onChange={onFiltersChange}
                />
              )}
            </header>
            {filteredCities.length === 0 ? (
              <p className="wtr-dest-card-list__empty wtr-explorer__list-empty">
                No cities match your filters. Try clearing filters or adjusting
                your income scenario above.
              </p>
            ) : (
              <div ref={listBodyRef} className="wtr-explorer__list-body">
                <div
                  ref={listScrollRef}
                  className="wtr-explorer__list-scroll wtr-scroll-y--hover"
                >
                  <div className="wtr-explorer__list-scroll-inner">
                    <div
                      ref={listCardsRef}
                      className="wtr-dest-card-list wtr-explorer__list-cards"
                    >
                      {listCities.map((item, index) => (
                        <RetirementDestinationCard
                          key={`${item.city.id}-${pinColorView}`}
                          scored={item}
                          monthlyIncome={explorationIncome}
                          pinColorView={pinColorView}
                          rank={
                            expatRankByCityId?.get(item.city.id) ??
                            safeListPage * LIST_PAGE_SIZE + index + 1
                          }
                          active={selectedId === item.city.id}
                          staggerIndex={index}
                          incomeFit={mapIncomeFitDisplayForCity(
                            item.city.city,
                            item.city.country,
                            explorationIncome,
                            filters,
                          )}
                          onSelect={() => openDestination(item.city.id)}
                          isFavorited={isFavoritedCity(
                            item.city.city,
                            item.city.country,
                          )}
                          onToggleFavorite={() => {
                            const recordIso = lookupRetirementCity(
                              item.city.city,
                              item.city.country,
                            )?.country_iso;
                            const iso =
                              recordIso ??
                              countryToIsoCode(item.city.country) ??
                              "";
                            onToggleFavoriteCity({
                              city: item.city.city,
                              country: item.city.country,
                              country_iso: iso,
                            });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <WtrCityListPagination
                  className="wtr-list-pagination--dest-panel wtr-list-pagination--explorer-list"
                  page={listPage}
                  pageSize={LIST_PAGE_SIZE}
                  totalCount={filteredCities.length}
                  onPageChange={changeListPage}
                  showRange={false}
                />
              </div>
            )}
          </div>
        </aside>

        {!listPanelOpen ? (
          <button
            type="button"
            className="wtr-explorer__list-reopen"
            aria-expanded={listPanelOpen}
            aria-controls="wtr-explorer-list-panel"
            onClick={expandListPanel}
          >
            <IconChevronRight size={16} stroke={1.5} aria-hidden />
            <span className="wtr-explorer__list-reopen-label">Top cities</span>
            <span className="wtr-explorer__list-reopen-count">
              <AnimatedCount
                value={filteredCities.length}
                className="wtr-explorer__list-reopen-count-num"
              />
            </span>
          </button>
        ) : null}
      </div>

      <RetirementDestinationPanel
        scored={selectedScored}
        monthlyIncome={explorationIncome}
        open={panelOpen && selectedScored != null}
        onClose={closePanel}
        compareSelected={
          selectedScored != null && compareIds.includes(selectedScored.city.id)
        }
        compareAtMax={compareIds.length >= MAX_COMPARE_CITIES}
        onToggleCompare={() => {
          if (selectedScored) onToggleCompare(selectedScored.city.id);
        }}
        isCountryExcluded={
          selectedScored != null &&
          excludedCountries.includes(selectedScored.city.country)
        }
        onExcludeCountry={() => {
          if (selectedScored) handleExcludeCountry(selectedScored.city.country);
        }}
        listPageNav={destinationListPageNav}
      />

      {!compareOverlayOpen ? (
        <WtrCompareBar
          cities={compareBarCities}
          onViewComparison={onViewComparison}
          onClearAll={onClearCompare}
        />
      ) : null}
    </div>
  );
}
