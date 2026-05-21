import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { AnimatedCount } from "../ui/AnimatedCount";
import type { ExplorationIncomeRange } from "../../lib/whereToRetire/budgetExplorationStats";
import {
  scoreAndFilterMapCities,
  type MapFilters,
} from "../../lib/whereToRetire/cityMapScoring";
import { RetirementDestinationCard } from "./RetirementDestinationCard";
import { RetirementDestinationPanel } from "./RetirementDestinationPanel";
import { WtrCompareBar } from "./WtrCompareBar";
import { RetirementLeafletMap } from "./RetirementLeafletMap";
import {
  RetirementMapFilters,
  WtrMapFiltersInline,
  WtrMapSortSelect,
} from "./RetirementMapFilters";
import { WtrCityListPagination } from "./WtrCityListPagination";
import "./RetirementMapExplorer.scss";

type Props = {
  explorationRange: ExplorationIncomeRange;
  /** Budget ceiling for fit scores and filtering (exact plan income at default slider). */
  monthlyIncomeCeiling: number;
  filters: MapFilters;
  onFiltersChange: (
    next: MapFilters | ((prev: MapFilters) => MapFilters),
  ) => void;
  headerSlot?: ReactNode;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  compareIds: string[];
  compareOverlayOpen?: boolean;
  onToggleCompare: (cityId: string) => void;
  onClearCompare: () => void;
  onViewComparison: () => void;
};

const LIST_PAGE_SIZE = 25;

function notifyMapResize() {
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  window.setTimeout(() => window.dispatchEvent(new Event("resize")), 340);
}

const MAX_COMPARE_CITIES = 5;

export function RetirementMapExplorer({
  explorationRange,
  monthlyIncomeCeiling,
  filters,
  onFiltersChange,
  headerSlot,
  filtersOpen,
  onFiltersOpenChange,
  compareIds,
  compareOverlayOpen = false,
  onToggleCompare,
  onClearCompare,
  onViewComparison,
}: Props) {
  const chromeRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [listPanelOpen, setListPanelOpen] = useState(true);
  const [listPage, setListPage] = useState(0);
  const filteredCities = useMemo(
    () => scoreAndFilterMapCities(monthlyIncomeCeiling, filters),
    [filters, monthlyIncomeCeiling],
  );

  const listPageCount = useMemo(
    () => Math.max(1, Math.ceil(filteredCities.length / LIST_PAGE_SIZE)),
    [filteredCities.length],
  );

  const safeListPage = Math.min(listPage, listPageCount - 1);

  const listCities = useMemo(() => {
    const start = safeListPage * LIST_PAGE_SIZE;
    return filteredCities.slice(start, start + LIST_PAGE_SIZE);
  }, [filteredCities, safeListPage]);

  const structuralFiltersKey = useMemo(
    () =>
      [
        explorationRange.min,
        explorationRange.max,
        filters.fitsMyIncome ? "1" : "0",
        filters.climate,
        [...filters.regions].sort().join(","),
        filters.regionScope,
        filters.sortBy,
        filters.englishSpeaking ? "1" : "0",
        filters.medicareAccess ? "1" : "0",
        filters.hideAdvisories ? "1" : "0",
      ].join("|"),
    [
      explorationRange.max,
      explorationRange.min,
      filters.climate,
      filters.englishSpeaking,
      filters.fitsMyIncome,
      filters.hideAdvisories,
      filters.medicareAccess,
      filters.regionScope,
      filters.regions,
      filters.sortBy,
    ],
  );

  const listCardsRef = useRef<HTMLDivElement>(null);
  const listBodyRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setListPage(0);
  }, [structuralFiltersKey]);

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

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMqChange = () => {
      if (mq.matches) onFiltersOpenChange(false);
    };
    onMqChange();
    mq.addEventListener("change", onMqChange);
    return () => mq.removeEventListener("change", onMqChange);
  }, [onFiltersOpenChange]);

  return (
    <div className="wtr-explorer">
      <div ref={chromeRef} className="wtr-explorer__chrome">
        {headerSlot ? (
          <div className="wtr-explorer__chrome-slot">{headerSlot}</div>
        ) : null}
        <WtrMapFiltersInline filters={filters} onChange={onFiltersChange} />
      </div>

      <div
        className={[
          "wtr-explorer__map-row",
          !listPanelOpen && "wtr-explorer__map-row--list-collapsed",
          filtersOpen && "wtr-explorer__map-row--filters-open",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {filtersOpen ? (
          <button
            type="button"
            className="wtr-explorer__filter-backdrop"
            aria-label="Close filters"
            onClick={closeFiltersPanel}
          />
        ) : null}

        <RetirementMapFilters
          open={filtersOpen}
          onClose={closeFiltersPanel}
          filters={filters}
          onChange={onFiltersChange}
        />
        <div className="wtr-explorer__map-stage">
          <RetirementLeafletMap
            destinations={filteredCities}
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
              <WtrMapSortSelect
                className="wtr-map-filters__sort-select--list-head"
                filters={filters}
                onChange={onFiltersChange}
              />
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
                          key={item.city.id}
                          scored={item}
                          rank={safeListPage * LIST_PAGE_SIZE + index + 1}
                          active={selectedId === item.city.id}
                          staggerIndex={index}
                          onSelect={() => openDestination(item.city.id)}
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
        monthlyIncome={monthlyIncomeCeiling}
        open={panelOpen && selectedScored != null}
        onClose={closePanel}
        compareSelected={
          selectedScored != null && compareIds.includes(selectedScored.city.id)
        }
        compareAtMax={compareIds.length >= MAX_COMPARE_CITIES}
        onToggleCompare={() => {
          if (selectedScored) onToggleCompare(selectedScored.city.id);
        }}
        listPageNav={destinationListPageNav}
      />

      {!compareOverlayOpen ? (
        <WtrCompareBar
          count={compareIds.length}
          onViewComparison={onViewComparison}
          onClearAll={onClearCompare}
        />
      ) : null}
    </div>
  );
}
