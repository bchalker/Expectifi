import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  IconArrowLeft,
  IconChevronRight,
  IconCircleX,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { Input, TextField } from "@heroui/react";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { AnimatedCount } from "../ui/AnimatedCount";
import { AppOverlayScrollbars } from "../ui/AppOverlayScrollbars";
import {
  resolveWhereToLook,
  scoreAndFilterMapCities,
  type MapFilters,
  type ScoredMapCity,
} from "../../lib/whereToRetire/cityMapScoring";
import { mapPinViewOptionsForWhereToLook } from "../../lib/whereToRetire/mapPinColorCopy";
import type { RetirementPreferences } from "../../types/preferences";
import { lookupRetirementCity } from "../../lib/whereToRetire/retirementCityLookup";
import { countryToIsoCode } from "../../utils/costOfLiving";
import { expatCommunitySortRank } from "../../utils/expatInfo";
import type { MapPinColorView } from "../../lib/whereToRetire/mapPinDisplay";
import { RetirementDestinationCard } from "./RetirementDestinationCard";
import { RetirementDestinationPanel } from "./RetirementDestinationPanel";
import { WtrCompareBar, type CompareBarCity } from "./WtrCompareBar";
import { LabeledBadgeSelect } from "../ui/LabeledBadgeSelect";
import {
  mapIncomeFitDisplayForCity,
  monthlyOutflowForMapCity,
} from "../../lib/whereToRetire/mapIncomeFit";
import { resolveCompareScored } from "../../hooks/useWtrComparisonColumns";
import { RetirementMapLibreMap } from "./RetirementMapLibreMap";
import { WtrCityListPagination } from "./WtrCityListPagination";
import {
  RetirementMapFilters,
  type MapOptionsPanelTab,
} from "./RetirementMapFilters";
import type { WtrFilterScrollTarget } from "../../lib/whereToRetire/wtrFilterPriorityCrossRef";
import type {
  ExcludedCountryEntry,
  FavoriteCityEntry,
} from "../../lib/retirementStorage";
import "./RetirementMapExplorer.scss";

export type WtrExplorerViewMode = "map" | "compare";

type Props = {
  /** Resolved income for map pins, scores, and list (slider value). */
  explorationIncome: number;
  /** Expectifi projected monthly income from the calculator. */
  planMonthlyIncome: number;
  filters: MapFilters;
  preferences: RetirementPreferences;
  onFiltersChange: (
    next: MapFilters | ((prev: MapFilters) => MapFilters),
  ) => void;
  pinColorView: MapPinColorView;
  onPinColorViewChange: (view: MapPinColorView) => void;
  headerSlot?: ReactNode;
  /** Rendered directly under `.wtr-explorer__chrome`, above the map row. */
  chromeFooterSlot?: ReactNode;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  drawerTab: MapOptionsPanelTab;
  onDrawerTabChange: (tab: MapOptionsPanelTab) => void;
  onAddExcludedCountry: (country: string) => void;
  onRemoveExcludedCountry: (country: string) => void;
  onRemoveFavorite: (city: string, country: string) => void;
  compareIds: string[];
  compareOverlayOpen?: boolean;
  explorerViewMode: WtrExplorerViewMode;
  onExplorerViewModeChange: (mode: WtrExplorerViewMode) => void;
  onClearCompare: () => void;
  onViewComparison: () => void;
  excludedCountries: string[];
  excludedCountryEntries: ExcludedCountryEntry[];
  favoriteCities: FavoriteCityEntry[];
  isFavoritedCity: (city: string, country: string) => boolean;
  onToggleFavoriteCity: (entry: {
    city: string;
    country: string;
    country_iso: string;
  }) => void;
  onDetailPanelOpenChange?: (open: boolean) => void;
  onBackToDashboard?: () => void;
  filterCrossRefHighlight?: WtrFilterScrollTarget | null;
  onFilterCrossRefHighlightClear?: () => void;
};

const LIST_PAGE_SIZE = 25;
const MOBILE_LIST_ONLY_MQ = "(max-width: 680px)";

function useWtrMobileListOnly(): boolean {
  const [mobileListOnly, setMobileListOnly] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_LIST_ONLY_MQ).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(MOBILE_LIST_ONLY_MQ);
    const onChange = () => setMobileListOnly(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mobileListOnly;
}

function notifyMapResize() {
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  window.setTimeout(() => window.dispatchEvent(new Event("resize")), 340);
}

function sortCitiesForPinView(
  cities: ScoredMapCity[],
  pinColorView: MapPinColorView,
  monthlyIncome: number,
  filters: Pick<MapFilters, "lifestyle">,
  expatSortDescending = true,
  budgetSortDescending = false,
  scoreSortDescending = true,
): ScoredMapCity[] {
  if (pinColorView === "score") {
    const scoreDelta = scoreSortDescending
      ? (a: ScoredMapCity, b: ScoredMapCity) => b.displayScore - a.displayScore
      : (a: ScoredMapCity, b: ScoredMapCity) => a.displayScore - b.displayScore;
    return [...cities].sort((a, b) => {
      const byScore = scoreDelta(a, b);
      if (byScore !== 0) return byScore;
      return a.city.city.localeCompare(b.city.city);
    });
  }
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

function pinViewSortHelper(
  pinColorView: MapPinColorView,
  scoreSortDescending: boolean,
  budgetSortDescending: boolean,
  expatSortDescending: boolean,
): string {
  if (pinColorView === "score") {
    return scoreSortDescending
      ? "from highest to lowest"
      : "from lowest to highest";
  }
  if (pinColorView === "budget") {
    return budgetSortDescending
      ? "from highest to lowest"
      : "from lowest to highest";
  }
  return expatSortDescending ? "largest first" : "smallest first";
}

function pinViewSelectLabel(pinColorView: MapPinColorView): string {
  if (pinColorView === "score") return "Best fit score";
  if (pinColorView === "budget") return "Lowest cost";
  return "Expat friendly";
}

export function RetirementMapExplorer({
  explorationIncome,
  planMonthlyIncome,
  filters,
  preferences,
  onFiltersChange,
  pinColorView,
  onPinColorViewChange,
  headerSlot,
  chromeFooterSlot,
  filtersOpen,
  onFiltersOpenChange,
  drawerTab,
  onDrawerTabChange,
  onAddExcludedCountry,
  onRemoveExcludedCountry,
  onRemoveFavorite,
  compareIds,
  compareOverlayOpen = false,
  explorerViewMode,
  onExplorerViewModeChange,
  onClearCompare,
  onViewComparison,
  excludedCountries,
  excludedCountryEntries,
  favoriteCities,
  isFavoritedCity,
  onToggleFavoriteCity,
  onDetailPanelOpenChange,
  onBackToDashboard,
  filterCrossRefHighlight = null,
  onFilterCrossRefHighlightClear,
}: Props) {
  const favoritedKeySet = useMemo(
    () => new Set(favoriteCities.map((f) => `${f.city}\u0001${f.country}`)),
    [favoriteCities],
  );
  const pinViewOptions = useMemo(
    () => mapPinViewOptionsForWhereToLook(resolveWhereToLook(filters)),
    [filters],
  );

  const chromeRef = useRef<HTMLDivElement>(null);
  const mobileListOnly = useWtrMobileListOnly();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [listPanelOpen, setListPanelOpen] = useState(true);
  const [listPage, setListPage] = useState(0);
  const [expatSortDescending, setExpatSortDescending] = useState(true);
  const [budgetSortDescending, setBudgetSortDescending] = useState(false);
  const [scoreSortDescending, setScoreSortDescending] = useState(true);
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [listSearchOpen, setListSearchOpen] = useState(false);

  const toggleListSearch = useCallback(() => {
    setListSearchOpen((open) => !open);
  }, []);

  const baseFilteredCities = useMemo(
    () =>
      scoreAndFilterMapCities(
        explorationIncome,
        filters,
        undefined,
        excludedCountries,
        preferences,
      ),
    [explorationIncome, filters, excludedCountries, preferences],
  );

  /** Canonical fit-score rank — stable when the list is re-sorted by pin view or filters. */
  const fitRankByCityId = useMemo(() => {
    const fitSorted = [...baseFilteredCities].sort((a, b) => {
      const byScore = b.retirementScore - a.retirementScore;
      if (byScore !== 0) return byScore;
      return a.city.city.localeCompare(b.city.city);
    });
    return new Map(fitSorted.map((item, index) => [item.city.id, index + 1]));
  }, [baseFilteredCities]);

  const sortedCities = useMemo(
    () =>
      sortCitiesForPinView(
        baseFilteredCities,
        pinColorView,
        explorationIncome,
        filters,
        expatSortDescending,
        budgetSortDescending,
        scoreSortDescending,
      ),
    [
      baseFilteredCities,
      pinColorView,
      explorationIncome,
      filters,
      expatSortDescending,
      budgetSortDescending,
      scoreSortDescending,
    ],
  );

  const filteredCities = useMemo(() => {
    const query = listSearchQuery.trim().toLowerCase();
    if (!query) return sortedCities;
    return sortedCities.filter(({ city }) => {
      const haystack = `${city.city} ${city.country}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [sortedCities, listSearchQuery]);

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
        filters.hideLevel3Cautions ? "1" : "0",
        filters.safety,
        filters.healthcare,
        filters.goodAirOnly ? "1" : "0",
        filters.maxFlightTime,
        filters.directFromUsOnly ? "1" : "0",
        filters.directFlightOrigin,
        filters.visaFreeDays,
        filters.minRetirementScore,
        JSON.stringify(filters.lifestyle ?? null),
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
      filters.lifestyle,
      filters.visaQualifyingOnly,
      filters.fitsMyIncome,
      filters.hideAdvisories,
      filters.hideLevel3Cautions,
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
  const listScrollRef = useRef<OverlayScrollbarsComponentRef>(null);

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
  }, [
    structuralFiltersKey,
    safeListPage,
    scoreSortDescending,
    budgetSortDescending,
    expatSortDescending,
    listSearchQuery,
  ]);

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

  const detailPanelOpen = panelOpen && selectedScored != null;

  useEffect(() => {
    onDetailPanelOpenChange?.(detailPanelOpen);
    return () => onDetailPanelOpenChange?.(false);
  }, [detailPanelOpen, onDetailPanelOpenChange]);

  const scrollListToTop = useCallback(() => {
    const viewport = listScrollRef.current?.osInstance()?.elements().viewport;
    viewport?.scrollTo({ top: 0, behavior: "auto" });
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

  const goToFilteredCityIndex = useCallback(
    (index: number) => {
      const item = filteredCities[index];
      if (!item) return;
      setSelectedId(item.city.id);
      setListPage(Math.floor(index / LIST_PAGE_SIZE));
      if (!panelOpen) setPanelOpen(true);
    },
    [filteredCities, panelOpen],
  );

  const destinationListNav = useMemo(() => {
    if (filteredCities.length <= 1 || selectedId == null) return null;
    const index = filteredCities.findIndex(
      (item) => item.city.id === selectedId,
    );
    if (index < 0) return null;
    return {
      index,
      totalCount: filteredCities.length,
      onPrev: () => {
        if (index > 0) goToFilteredCityIndex(index - 1);
      },
      onNext: () => {
        if (index < filteredCities.length - 1) goToFilteredCityIndex(index + 1);
      },
    };
  }, [filteredCities, goToFilteredCityIndex, selectedId]);

  const openDestination = useCallback(
    (id: string) => {
      setSelectedId(id);
      const index = filteredCities.findIndex((s) => s.city.id === id);
      if (index >= 0) setListPage(Math.floor(index / LIST_PAGE_SIZE));
      if (panelOpen && selectedId === id) return;
      if (panelOpen) return;
      setPanelOpen(true);
    },
    [filteredCities, panelOpen, selectedId],
  );

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const expandListPanel = useCallback(() => {
    setListPanelOpen(true);
  }, []);

  useEffect(() => {
    if (mobileListOnly) setListPanelOpen(true);
  }, [mobileListOnly]);

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
      </div>

      {chromeFooterSlot ? (
        <div className="wtr-explorer__chrome-footer">{chromeFooterSlot}</div>
      ) : null}

      <div
        className={[
          "wtr-explorer__map-row",
          filtersOpen && "wtr-explorer__map-row--filters-open",
          mobileListOnly && "wtr-explorer__map-row--list-only",
          !mobileListOnly &&
            !listPanelOpen &&
            "wtr-explorer__map-row--list-collapsed",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <aside
          id="wtr-explorer-list-panel"
          className="wtr-explorer__list-panel"
          aria-label="City list"
          aria-hidden={!mobileListOnly && !listPanelOpen}
        >
          <div className="wtr-explorer__list-panel-inner">
            {onBackToDashboard ? (
              <div className="wtr-explorer__list-panel-back where-to-retire__main-panel-back">
                <button
                  type="button"
                  className="app-page-back where-to-retire__panel-back"
                  onClick={onBackToDashboard}
                >
                  <IconArrowLeft size={16} stroke={1.5} aria-hidden />
                  Back to dashboard
                </button>
              </div>
            ) : null}
            <header className="wtr-explorer__list-head">
              <div className="wtr-explorer__list-head-top">
              <LabeledBadgeSelect
                className="wtr-explorer__pin-view-select"
                value={pinColorView}
                options={pinViewOptions}
                onChange={(view) => {
                  onPinColorViewChange(view);
                  setListPage(0);
                }}
                label={pinViewSelectLabel(pinColorView)}
                helper={pinViewSortHelper(
                  pinColorView,
                  scoreSortDescending,
                  budgetSortDescending,
                  expatSortDescending,
                )}
                helperPlacement="below"
                ariaLabel="Map view"
              />
              <div className="wtr-explorer__list-head-actions">
                <button
                  type="button"
                  className="wtr-explorer__list-head-icon-btn"
                  aria-label={
                    pinColorView === "expat"
                      ? expatSortDescending
                        ? "Sort by expat community size, largest first. Click to sort smallest first."
                        : "Sort by expat community size, smallest first. Click to sort largest first."
                      : pinColorView === "budget"
                        ? budgetSortDescending
                          ? "Sort by monthly cost, highest first. Click to sort lowest first."
                          : "Sort by monthly cost, lowest first. Click to sort highest first."
                        : scoreSortDescending
                          ? "Best fit score, highest first. Click to sort lowest first."
                          : "Best fit score, lowest first. Click to sort highest first."
                  }
                  onClick={() => {
                    if (pinColorView === "expat") {
                      setExpatSortDescending((prev) => !prev);
                    } else if (pinColorView === "budget") {
                      setBudgetSortDescending((prev) => !prev);
                    } else {
                      setScoreSortDescending((prev) => !prev);
                    }
                    setListPage(0);
                  }}
                >
                  {(pinColorView === "expat"
                    ? expatSortDescending
                    : pinColorView === "budget"
                      ? budgetSortDescending
                      : scoreSortDescending) ? (
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
                <span className="wtr-explorer__list-head-divider" aria-hidden />
                <button
                  type="button"
                  className={[
                    "wtr-explorer__list-head-icon-btn",
                    listSearchOpen && "wtr-explorer__list-head-icon-btn--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={listSearchOpen ? "Hide city search" : "Search cities"}
                  aria-pressed={listSearchOpen}
                  onClick={toggleListSearch}
                >
                  <IconSearch
                    className="wtr-explorer__list-sort-icon"
                    size={18}
                    stroke={1.5}
                    aria-hidden
                  />
                </button>
              </div>
              </div>
              {listSearchOpen ? (
              <div
                className={[
                  "wtr-explorer__list-search",
                  listSearchQuery && "wtr-explorer__list-search--has-value",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <TextField
                  className="wtr-explorer__list-search-field"
                  variant="secondary"
                  fullWidth
                  aria-label="Search city list"
                  value={listSearchQuery}
                  onChange={(value) => {
                    setListSearchQuery(value);
                    setListPage(0);
                  }}
                >
                  <Input
                    type="text"
                    inputMode="search"
                    placeholder="Search cities or countries"
                    autoFocus
                  />
                </TextField>
                {listSearchQuery ? (
                  <button
                    type="button"
                    className="wtr-explorer__list-search-clear"
                    aria-label="Clear search"
                    onClick={() => {
                      setListSearchQuery("");
                      setListPage(0);
                    }}
                  >
                    <IconCircleX size={16} stroke={1.5} aria-hidden />
                  </button>
                ) : null}
              </div>
              ) : null}
            </header>
            {filteredCities.length === 0 ? (
              <p className="wtr-dest-card-list__empty wtr-explorer__list-empty">
                {listSearchQuery.trim()
                  ? `No cities match "${listSearchQuery.trim()}".`
                  : "No cities match your filters. Try clearing filters or adjusting your income scenario above."}
              </p>
            ) : (
              <div ref={listBodyRef} className="wtr-explorer__list-body">
                <AppOverlayScrollbars
                  ref={listScrollRef}
                  className="wtr-explorer__list-scroll"
                  defer={false}
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
                          rank={fitRankByCityId.get(item.city.id) ?? 0}
                          active={selectedId === item.city.id}
                          staggerIndex={index}
                          incomeFit={mapIncomeFitDisplayForCity(
                            item.city.city,
                            item.city.country,
                            explorationIncome,
                            filters,
                          )}
                          mapFilters={filters}
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
                </AppOverlayScrollbars>
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

        {!mobileListOnly ? (
          <div className="wtr-explorer__map-stage">
            {filtersOpen ? (
              <button
                type="button"
                className="wtr-explorer__drawer-backdrop wtr-explorer__drawer-backdrop--open"
                aria-label="Close map options"
                onClick={() => onFiltersOpenChange(false)}
              />
            ) : null}
            <RetirementMapLibreMap
              destinations={filteredCities}
              monthlyIncome={explorationIncome}
              pinColorView={pinColorView}
              filters={filters}
              onFiltersChange={onFiltersChange}
              favoritedKeySet={favoritedKeySet}
              selectedId={selectedId}
              detailPanelOpen={detailPanelOpen}
              suppressTooltips={filtersOpen}
              fitKey={structuralFiltersKey}
              onSelect={openDestination}
            />
          </div>
        ) : null}

        {!mobileListOnly && !listPanelOpen ? (
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

        <RetirementDestinationPanel
          scored={selectedScored}
          monthlyIncome={explorationIncome}
          planMonthlyIncome={planMonthlyIncome}
          mapFilters={filters}
          preferences={preferences}
          open={detailPanelOpen}
          onClose={closePanel}
          listNav={destinationListNav}
        />

        <RetirementMapFilters
          open={filtersOpen}
          onClose={() => onFiltersOpenChange(false)}
          activeTab={drawerTab}
          onActiveTabChange={onDrawerTabChange}
          filters={filters}
          onChange={onFiltersChange}
          monthlyIncome={explorationIncome}
          excludedCountryEntries={excludedCountryEntries}
          favoriteCities={favoriteCities}
          onAddExcludedCountry={onAddExcludedCountry}
          onRemoveExcludedCountry={onRemoveExcludedCountry}
          onRemoveFavorite={onRemoveFavorite}
          filterCrossRefHighlight={filterCrossRefHighlight}
          onFilterCrossRefHighlightClear={onFilterCrossRefHighlightClear}
        />
      </div>

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
