import { useMemo, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  CloseButton,
} from "@heroui/react";
import { AppSelect } from "../ui/AppSelect";
import { AppButton } from "../ui/AppButton";
import { BottomSheetHandle } from "../ui/BottomSheetHandle";
import { useBottomSheetDrag } from "../../hooks/useBottomSheetDrag";
import { useIsMobileBottomSheet } from "../../hooks/useMobileBottomSheet";
import {
  ALL_DESTINATION_REGIONS,
  applyMapFiltersBudgetPreferences,
  countActiveMapFilters,
  DEFAULT_MAP_FILTERS,
  DIRECT_FLIGHT_ORIGIN_OPTIONS,
  buildLifestyleInputs,
  hasNonDefaultMapFilters,
  resolveWhereToLook,
  type ClimateFilter,
  type DirectFlightOrigin,
  type EnglishProficiencyFilter,
  type ForeignTaxFilter,
  type HealthcareFilter,
  type MapFilters,
  type MapSortBy,
  type MaxFlightTimeFilter,
  type SafetyFilter,
  type VisaFreeDaysFilter,
} from "../../lib/whereToRetire/cityMapScoring";
import type {
  ExcludedCountryEntry,
  FavoriteCityEntry,
} from "../../lib/retirementStorage";
import { WtrMapFiltersExcludeTab } from "./WtrMapFiltersExcludeTab";
import { WtrMapFiltersFavoritesTab } from "./WtrMapFiltersFavoritesTab";
import {
  WtrFilterSegmentedRow,
  WtrFilterToggleBox,
} from "./WtrFilterFieldChrome";
import { WtrMinRetirementScoreSlider } from "./WtrMinRetirementScoreSlider";
import { WtrBudgetTabContent } from "./WtrBudgetTabContent";
import { WtrFilterCrossRefAnchor } from "./WtrFilterPriorityCrossRef";
import type { WtrFilterScrollTarget } from "../../lib/whereToRetire/wtrFilterPriorityCrossRef";
import { budgetPreferencesEqual, DEFAULT_BUDGET_PREFERENCES } from "../../utils/costOfLiving";
import "./RetirementMapFilters.scss";
import "./BudgetPanel.scss";
import "./WtrFilterPriorityCrossRef.scss";

export type MapOptionsPanelTab =
  | "filters"
  | "exclude"
  | "favorites"
  | "display"
  | "budget";

const FOREIGN_TAX_SEGMENTS: { id: ForeignTaxFilter; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "not-taxed-locally", label: "10%+" },
  { id: "low-flat-rate", label: "20%" },
  { id: "standard", label: "30%+" },
];

const SORT_OPTIONS: { id: MapSortBy; label: string }[] = [
  { id: "affordability-fit", label: "Best retirement income fit score" },
  { id: "lowest-budget", label: "Lowest monthly budget" },
  { id: "highest-surplus", label: "Highest monthly surplus" },
  { id: "quality-of-life", label: "Best quality of life" },
  { id: "healthcare-access", label: "Best healthcare access" },
  { id: "dollar-strength", label: "Strongest dollar" },
];

const ENGLISH_PROFICIENCY_OPTIONS: {
  id: EnglishProficiencyFilter;
  label: string;
}[] = [
  { id: "any", label: "Any English level" },
  { id: "english-only", label: "English only" },
  { id: "mostly-english", label: "Mostly English" },
  { id: "some-english", label: "Some English" },
];

const CLIMATE_OPTIONS: { id: ClimateFilter; label: string }[] = [
  { id: "any", label: "Any climate" },
  { id: "warm-year-round", label: "Warm year-round" },
  { id: "mediterranean", label: "Mediterranean" },
  { id: "tropical", label: "Tropical" },
  { id: "four-seasons", label: "Four seasons" },
];

const SAFETY_SEGMENTS: { id: SafetyFilter; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "reasonably-safe", label: "55+" },
  { id: "very-safe", label: "75+" },
];

const HEALTHCARE_SEGMENTS: { id: HealthcareFilter; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "good-care", label: "60+" },
  { id: "excellent", label: "75+" },
];

const MAX_FLIGHT_TIME_SEGMENTS: { id: MaxFlightTimeFilter; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "under-5", label: "5hrs" },
  { id: "under-10", label: "10hrs" },
  { id: "under-15", label: "15hrs" },
];

const VISA_FREE_DAYS_SEGMENTS: { id: VisaFreeDaysFilter; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "30-plus", label: "30+" },
  { id: "60-plus", label: "60+" },
  { id: "90-plus", label: "90+" },
  { id: "180-plus", label: "180+" },
];

type FilterChangeProps = {
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
};

function filterSelectFieldClass(chosen: boolean, extra?: string) {
  return [
    "wtr-map-filters__field",
    extra,
    chosen && "wtr-map-filters__field--chosen",
  ]
    .filter(Boolean)
    .join(" ");
}

type SortSelectProps = FilterChangeProps & {
  className?: string;
};

export function WtrMapSortSelect({
  filters,
  onChange,
  className,
}: SortSelectProps) {
  return (
    <AppSelect
      className={[
        "wtr-map-filters__field",
        "wtr-map-filters__sort-select",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      ariaLabel="Sort by"
      label="Sort by"
      labelClassName="wtr-map-filters__field-label"
      value={filters.sortBy}
      options={SORT_OPTIONS.map((opt) => ({ id: opt.id, label: opt.label }))}
      onChange={(id) => onChange({ ...filters, sortBy: id as MapSortBy })}
      popoverClassName="wtr-map-filters__select-popover"
      listClassName="wtr-map-filters__select-list"
    />
  );
}

function EnglishProficiencySelect({ filters, onChange }: FilterChangeProps) {
  return (
    <AppSelect
      className={filterSelectFieldClass(filters.englishProficiency !== "any")}
      ariaLabel="English proficiency"
      label="English proficiency"
      labelClassName="wtr-map-filters__field-label"
      value={filters.englishProficiency}
      options={ENGLISH_PROFICIENCY_OPTIONS.map((opt) => ({
        id: opt.id,
        label: opt.label,
      }))}
      onChange={(id) =>
        onChange({
          ...filters,
          englishProficiency: id as EnglishProficiencyFilter,
        })
      }
      popoverClassName="wtr-map-filters__select-popover"
      listClassName="wtr-map-filters__select-list"
    />
  );
}

function ClimateSelect({ filters, onChange }: FilterChangeProps) {
  return (
    <AppSelect
      className={filterSelectFieldClass(filters.climate !== "any")}
      ariaLabel="Climate"
      label="Climate"
      labelClassName="wtr-map-filters__field-label"
      value={filters.climate}
      options={CLIMATE_OPTIONS.map((opt) => ({ id: opt.id, label: opt.label }))}
      onChange={(id) =>
        onChange({ ...filters, climate: id as ClimateFilter })
      }
      popoverClassName="wtr-map-filters__select-popover"
      listClassName="wtr-map-filters__select-list"
    />
  );
}

function DirectFlightOriginEmbedded({ filters, onChange }: FilterChangeProps) {
  return (
    <>
      <span className="wtr-map-filters__toggle-field-label">From</span>
      <AppSelect
        className="wtr-map-filters__toggle-embedded-select"
        ariaLabel="Direct flights from"
        value={filters.directFlightOrigin}
        options={DIRECT_FLIGHT_ORIGIN_OPTIONS.map((opt) => ({
          id: opt.id,
          label: opt.label,
        }))}
        onChange={(id) =>
          onChange({
            ...filters,
            directFlightOrigin: id as DirectFlightOrigin,
          })
        }
        popoverClassName="wtr-map-filters__select-popover"
        listClassName="wtr-map-filters__select-list"
      />
    </>
  );
}

function FilterGroupCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const titleId = `wtr-map-filter-group-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section className="wtr-map-filters__group-card" aria-labelledby={titleId}>
      <h3 id={titleId} className="wtr-map-filters__group-title">
        {title}
      </h3>
      {subtitle ? (
        <p className="wtr-map-filters__group-subtitle">{subtitle}</p>
      ) : null}
      <div className="wtr-map-filters__group-stack">{children}</div>
    </section>
  );
}

function FilterControlsStack({
  filters,
  onChange,
  filterCrossRefHighlight = null,
}: FilterChangeProps & {
  filterCrossRefHighlight?: WtrFilterScrollTarget | null;
}) {
  const showUsFilters = resolveWhereToLook(filters) === "us";

  return (
    <div className="wtr-map-filters__controls">
      <FilterGroupCard title="Taxes and Visas">
        <WtrFilterToggleBox
          label="Visa qualifying"
          pressed={filters.visaQualifyingOnly}
          onToggle={() =>
            onChange({
              ...filters,
              visaQualifyingOnly: !filters.visaQualifyingOnly,
            })
          }
        />
        <WtrFilterSegmentedRow
          label="Visa-free days"
          ariaLabel="Visa-free days"
          value={filters.visaFreeDays}
          options={VISA_FREE_DAYS_SEGMENTS}
          onChange={(visaFreeDays) => onChange({ ...filters, visaFreeDays })}
        />
        <WtrFilterCrossRefAnchor
          crossRefKey="foreignTax"
          highlighted={filterCrossRefHighlight === "foreignTax"}
        >
          <WtrFilterSegmentedRow
            label="Taxes under"
            ariaLabel="Taxes under"
            value={filters.foreignTax}
            options={FOREIGN_TAX_SEGMENTS}
            onChange={(foreignTax) => onChange({ ...filters, foreignTax })}
          />
        </WtrFilterCrossRefAnchor>
      </FilterGroupCard>

      <FilterGroupCard title="Transportation/Flights">
        <WtrFilterToggleBox
          label="Direct flights only"
          pressed={filters.directFromUsOnly}
          onToggle={() =>
            onChange({
              ...filters,
              directFromUsOnly: !filters.directFromUsOnly,
            })
          }
          embedded={
            <DirectFlightOriginEmbedded filters={filters} onChange={onChange} />
          }
        />
        <WtrFilterSegmentedRow
          label="Distance"
          ariaLabel="Flight distance"
          value={filters.maxFlightTime}
          options={MAX_FLIGHT_TIME_SEGMENTS}
          onChange={(maxFlightTime) => onChange({ ...filters, maxFlightTime })}
        />
      </FilterGroupCard>

      <FilterGroupCard title="Healthcare">
        <WtrFilterCrossRefAnchor
          crossRefKey="healthcare"
          highlighted={filterCrossRefHighlight === "healthcare"}
        >
          <WtrFilterSegmentedRow
            label="Healthcare"
            ariaLabel="Healthcare quality"
            value={filters.healthcare}
            options={HEALTHCARE_SEGMENTS}
            onChange={(healthcare) => onChange({ ...filters, healthcare })}
          />
        </WtrFilterCrossRefAnchor>
        {showUsFilters ? (
          <WtrFilterToggleBox
            label="Medicare access"
            pressed={filters.medicareAccess}
            onToggle={() =>
              onChange({ ...filters, medicareAccess: !filters.medicareAccess })
            }
          />
        ) : null}
      </FilterGroupCard>

      <FilterGroupCard title="Quality of Life">
        <EnglishProficiencySelect filters={filters} onChange={onChange} />
        <WtrFilterCrossRefAnchor
          crossRefKey="climate"
          highlighted={filterCrossRefHighlight === "climate"}
        >
          <ClimateSelect filters={filters} onChange={onChange} />
        </WtrFilterCrossRefAnchor>
        <WtrFilterCrossRefAnchor
          crossRefKey="safety"
          highlighted={filterCrossRefHighlight === "safety"}
        >
          <WtrFilterSegmentedRow
            label="Safety"
            ariaLabel="Safety"
            value={filters.safety}
            options={SAFETY_SEGMENTS}
            onChange={(safety) => onChange({ ...filters, safety })}
          />
        </WtrFilterCrossRefAnchor>
        <WtrFilterCrossRefAnchor
          crossRefKey="goodAirOnly"
          highlighted={filterCrossRefHighlight === "goodAirOnly"}
        >
          <WtrFilterToggleBox
            label="Good air only"
            pressed={filters.goodAirOnly}
            onToggle={() =>
              onChange({ ...filters, goodAirOnly: !filters.goodAirOnly })
            }
          />
        </WtrFilterCrossRefAnchor>
        <div
          className="wtr-filter-cross-ref-anchor"
          data-wtr-filter-crossref="minRetirementScore"
          data-wtr-filter-crossref-highlight={
            filterCrossRefHighlight === "minRetirementScore" ? "true" : undefined
          }
        >
          <WtrMinRetirementScoreSlider
            value={filters.minRetirementScore}
            onChange={(minRetirementScore) =>
              onChange({ ...filters, minRetirementScore })
            }
          />
        </div>
        <WtrFilterCrossRefAnchor
          crossRefKey="hideAdvisories"
          highlighted={filterCrossRefHighlight === "hideAdvisories"}
        >
          <WtrFilterToggleBox
            label="Hide unsafe cities"
            subtitle="with travel advisories"
            pressed={filters.hideAdvisories}
            onToggle={() =>
              onChange({ ...filters, hideAdvisories: !filters.hideAdvisories })
            }
          />
        </WtrFilterCrossRefAnchor>
      </FilterGroupCard>
    </div>
  );
}

type PanelProps = FilterChangeProps & {
  open: boolean;
  onClose: () => void;
  activeTab: MapOptionsPanelTab;
  onActiveTabChange: (tab: MapOptionsPanelTab) => void;
  monthlyIncome: number;
  excludedCountryEntries: ExcludedCountryEntry[];
  favoriteCities: FavoriteCityEntry[];
  onAddExcludedCountry: (country: string) => void;
  onRemoveExcludedCountry: (country: string) => void;
  onRemoveFavorite: (city: string, country: string) => void;
  filterCrossRefHighlight?: WtrFilterScrollTarget | null;
  onFilterCrossRefHighlightClear?: () => void;
};

const FILTER_PANEL_TABS: { id: MapOptionsPanelTab; label: string }[] = [
  { id: "filters", label: "Filters" },
  { id: "exclude", label: "Excluded" },
  { id: "favorites", label: "Favorites" },
  { id: "display", label: "Display" },
  { id: "budget", label: "Budget" },
];

export function RetirementMapFilters({
  open,
  onClose,
  activeTab,
  onActiveTabChange,
  filters,
  onChange,
  monthlyIncome,
  excludedCountryEntries,
  favoriteCities,
  onAddExcludedCountry,
  onRemoveExcludedCountry,
  onRemoveFavorite,
  filterCrossRefHighlight = null,
  onFilterCrossRefHighlightClear,
}: PanelProps) {
  const isMobileSheet = useIsMobileBottomSheet();
  const panelRef = useRef<HTMLElement>(null);
  const activeCount = countActiveMapFilters(filters);
  const showClearFilters = hasNonDefaultMapFilters(filters);
  const showClearBudget = !budgetPreferencesEqual(
    filters.budgetPreferences,
    DEFAULT_BUDGET_PREFERENCES,
  );

  useEffect(() => {
    if (!open || !filterCrossRefHighlight) return;
    const frame = window.requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector(
        `[data-wtr-filter-crossref="${filterCrossRefHighlight}"]`,
      );
      target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      onFilterCrossRefHighlightClear?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, filterCrossRefHighlight, onFilterCrossRefHighlightClear]);

  const panelTabs = useMemo(
    () =>
      FILTER_PANEL_TABS.map((tab) =>
        tab.id === "exclude" && excludedCountryEntries.length > 0
          ? { ...tab, label: `Excluded (${excludedCountryEntries.length})` }
          : tab,
      ),
    [excludedCountryEntries.length],
  );

  const {
    isDragging,
    panelStyle,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useBottomSheetDrag({
    enabled: isMobileSheet,
    open,
    panelRef,
    onDismiss: onClose,
  });

  const clearFilters = () => {
    onChange({
      ...DEFAULT_MAP_FILTERS,
      regions: [...ALL_DESTINATION_REGIONS],
      budgetPreferences: filters.budgetPreferences,
      lifestyle: buildLifestyleInputs(filters.budgetPreferences),
    });
  };

  const clearBudget = () => {
    onChange(applyMapFiltersBudgetPreferences(filters, DEFAULT_BUDGET_PREFERENCES));
  };

  const panel = (
    <>
      {isMobileSheet && open ? (
        <div
          className="mobile-bottom-sheet-backdrop mobile-bottom-sheet-backdrop--open"
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        ref={panelRef}
        id="wtr-map-filters-panel"
        style={isMobileSheet ? panelStyle : undefined}
        className={[
          "wtr-map-filters",
          "wtr-map-filters--panel",
          isMobileSheet ? "wtr-map-filters--side" : "wtr-map-filters--map-rail",
          isMobileSheet && "wtr-map-filters--mobile-sheet",
          isDragging && "mobile-bottom-sheet-panel--dragging",
          open && "wtr-map-filters--open",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Filters"
        aria-hidden={!open}
      >
        {isMobileSheet ? (
          <BottomSheetHandle
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        ) : null}
      <div className="wtr-map-filters__inner">
      <header className="wtr-map-filters__head">
        <div className="wtr-map-filters__head-copy">
          <h2 className="wtr-map-filters__head-title">Filters</h2>
          {activeTab === "filters" && activeCount > 0 ? (
            <p className="wtr-map-filters__head-active">{activeCount} active</p>
          ) : null}
          {activeTab === "favorites" && favoriteCities.length > 0 ? (
            <p className="wtr-map-filters__head-active">
              {favoriteCities.length} saved
            </p>
          ) : null}
        </div>
        <CloseButton className="panel-close-btn" aria-label="Close filters" onPress={onClose} />
      </header>

      <div
        className="wtr-map-filters__tabs"
        role="tablist"
        aria-label="Filter panel sections"
      >
        {panelTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={[
              "wtr-map-filters__tab",
              activeTab === tab.id && "wtr-map-filters__tab--active",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-selected={activeTab === tab.id}
            onClick={() => onActiveTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="wtr-map-filters__scroll">
        <div className="wtr-map-filters__body">
          {activeTab === "filters" ? (
            <FilterControlsStack
              filters={filters}
              onChange={onChange}
              filterCrossRefHighlight={filterCrossRefHighlight}
            />
          ) : null}

          {activeTab === "exclude" ? (
            <WtrMapFiltersExcludeTab
              filters={filters}
              onChange={onChange}
              excludedCountryEntries={excludedCountryEntries}
              onAddExcludedCountry={onAddExcludedCountry}
              onRemoveExcludedCountry={onRemoveExcludedCountry}
            />
          ) : null}

          {activeTab === "favorites" ? (
            <WtrMapFiltersFavoritesTab
              favoriteCities={favoriteCities}
              monthlyIncome={monthlyIncome}
              filters={filters}
              onRemoveFavorite={onRemoveFavorite}
            />
          ) : null}

          {activeTab === "display" ? (
            <p className="wtr-map-filters__display-placeholder">
              Min QoL, language, and flight filters coming soon.
            </p>
          ) : null}

          {activeTab === "budget" ? (
            <WtrBudgetTabContent filters={filters} onChange={onChange} />
          ) : null}
        </div>
      </div>

      <footer className="wtr-map-filters__footer">
        {activeTab === "filters" && showClearFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="wtr-map-filters__clear"
            onPress={clearFilters}
          >
            Clear filters
          </Button>
        ) : null}
        {activeTab === "budget" && showClearBudget ? (
          <Button
            variant="ghost"
            size="sm"
            className="wtr-map-filters__clear"
            onPress={clearBudget}
          >
            Reset to typical
          </Button>
        ) : null}
        <AppButton
          type="button"
          size="md"
          variant="primary"
          className="wtr-map-filters__confirm"
          onPress={onClose}
        >
          Confirm
        </AppButton>
      </footer>
      </div>
    </aside>
    </>
  );

  if (isMobileSheet && typeof document !== "undefined") {
    return createPortal(panel, document.body);
  }

  return panel;
}
