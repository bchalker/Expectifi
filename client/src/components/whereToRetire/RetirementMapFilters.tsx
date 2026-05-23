import { useEffect, useState, type ReactNode } from "react";
import {
  Button,
  CloseButton,
  Label,
  ListBox,
  Select,
} from "@heroui/react";
import { firstKeyFromSelectSelection } from "../../lib/dateOfBirthSelect";
import {
  ALL_DESTINATION_REGIONS,
  countActiveMapFilters,
  DEFAULT_HEALTH_INS_MONTHLY_USD,
  DEFAULT_MAP_FILTERS,
  DIRECT_FLIGHT_ORIGIN_OPTIONS,
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
import type { FavoriteCityEntry } from "../../lib/retirementStorage";
import { WtrMapFiltersExcludeTab } from "./WtrMapFiltersExcludeTab";
import { WtrMapFiltersFavoritesTab } from "./WtrMapFiltersFavoritesTab";
import {
  WtrFilterSegmentedRow,
  WtrFilterToggleBox,
} from "./WtrFilterFieldChrome";
import { WtrMinRetirementScoreSlider } from "./WtrMinRetirementScoreSlider";
import "./RetirementMapFilters.scss";

type FilterPanelTab = "filters" | "exclude" | "favorites" | "display";

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
    <Select
      className={[
        "wtr-map-filters__field",
        "wtr-map-filters__sort-select",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      variant="secondary"
      aria-label="Sort by"
      selectedKey={filters.sortBy}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys);
        if (!id) return;
        onChange({ ...filters, sortBy: id as MapSortBy });
      }}
    >
      <Label className="wtr-map-filters__field-label">Sort by</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="wtr-map-filters__select-popover">
        <ListBox className="wtr-map-filters__select-list">
          {SORT_OPTIONS.map((opt) => (
            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function EnglishProficiencySelect({ filters, onChange }: FilterChangeProps) {
  return (
    <Select
      className={filterSelectFieldClass(filters.englishProficiency !== "any")}
      variant="secondary"
      aria-label="English proficiency"
      selectedKey={filters.englishProficiency}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys);
        if (!id) return;
        onChange({
          ...filters,
          englishProficiency: id as EnglishProficiencyFilter,
        });
      }}
    >
      <Label className="wtr-map-filters__field-label">English proficiency</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="wtr-map-filters__select-popover">
        <ListBox className="wtr-map-filters__select-list">
          {ENGLISH_PROFICIENCY_OPTIONS.map((opt) => (
            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function ClimateSelect({ filters, onChange }: FilterChangeProps) {
  return (
    <Select
      className={filterSelectFieldClass(filters.climate !== "any")}
      variant="secondary"
      aria-label="Climate"
      selectedKey={filters.climate}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys);
        if (!id) return;
        onChange({ ...filters, climate: id as ClimateFilter });
      }}
    >
      <Label className="wtr-map-filters__field-label">Climate</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="wtr-map-filters__select-popover">
        <ListBox className="wtr-map-filters__select-list">
          {CLIMATE_OPTIONS.map((opt) => (
            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function DirectFlightOriginEmbedded({ filters, onChange }: FilterChangeProps) {
  return (
    <>
      <span className="wtr-map-filters__toggle-field-label">From</span>
      <Select
        className="wtr-map-filters__toggle-embedded-select"
        variant="secondary"
        aria-label="Direct flights from"
        selectedKey={filters.directFlightOrigin}
        onSelectionChange={(keys) => {
          const id = firstKeyFromSelectSelection(keys);
          if (!id) return;
          onChange({
            ...filters,
            directFlightOrigin: id as DirectFlightOrigin,
          });
        }}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="wtr-map-filters__select-popover">
          <ListBox className="wtr-map-filters__select-list">
            {DIRECT_FLIGHT_ORIGIN_OPTIONS.map((opt) => (
              <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                {opt.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </>
  );
}

function parseHealthInsUsd(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0) return DEFAULT_HEALTH_INS_MONTHLY_USD;
  return Math.round(n);
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

function HealthInsuranceEstimateField({ filters, onChange }: FilterChangeProps) {
  const [healthDraft, setHealthDraft] = useState(() =>
    String(Math.round(filters.healthInsMonthlyUsd)),
  );

  useEffect(() => {
    setHealthDraft(String(Math.round(filters.healthInsMonthlyUsd)));
  }, [filters.healthInsMonthlyUsd]);

  const healthEmbedded = (
    <label className="wtr-map-filters__health-amount-inline">
      <span className="wtr-map-filters__toggle-field-label">Est.</span>
      <span className="wtr-map-filters__health-amount-prefix" aria-hidden>
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        className="wtr-map-filters__health-amount-input"
        aria-label="Monthly health insurance estimate"
        value={healthDraft}
        onChange={(e) => setHealthDraft(e.target.value)}
        onBlur={() => {
          const next = parseHealthInsUsd(healthDraft);
          setHealthDraft(String(next));
          onChange({ ...filters, healthInsMonthlyUsd: next });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />
      <span className="wtr-map-filters__health-amount-suffix">/mo</span>
    </label>
  );

  return (
    <WtrFilterToggleBox
      label="Include health insurance est."
      pressed={filters.includeHealthIns}
      onToggle={() =>
        onChange({
          ...filters,
          includeHealthIns: !filters.includeHealthIns,
        })
      }
      embedded={healthEmbedded}
    />
  );
}

function FilterControlsStack({ filters, onChange }: FilterChangeProps) {
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
        <WtrFilterSegmentedRow
          label="Taxes under"
          ariaLabel="Taxes under"
          value={filters.foreignTax}
          options={FOREIGN_TAX_SEGMENTS}
          onChange={(foreignTax) => onChange({ ...filters, foreignTax })}
        />
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
        <HealthInsuranceEstimateField filters={filters} onChange={onChange} />
        <WtrFilterSegmentedRow
          label="Healthcare"
          ariaLabel="Healthcare quality"
          value={filters.healthcare}
          options={HEALTHCARE_SEGMENTS}
          onChange={(healthcare) => onChange({ ...filters, healthcare })}
        />
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
        <ClimateSelect filters={filters} onChange={onChange} />
        <WtrFilterSegmentedRow
          label="Safety"
          ariaLabel="Safety"
          value={filters.safety}
          options={SAFETY_SEGMENTS}
          onChange={(safety) => onChange({ ...filters, safety })}
        />
        <WtrFilterToggleBox
          label="Good air only"
          pressed={filters.goodAirOnly}
          onToggle={() =>
            onChange({ ...filters, goodAirOnly: !filters.goodAirOnly })
          }
        />
        <WtrMinRetirementScoreSlider
          value={filters.minRetirementScore}
          onChange={(minRetirementScore) =>
            onChange({ ...filters, minRetirementScore })
          }
        />
        <WtrFilterToggleBox
          label="Hide unsafe cities"
          subtitle="with travel advisories"
          pressed={filters.hideAdvisories}
          onToggle={() =>
            onChange({ ...filters, hideAdvisories: !filters.hideAdvisories })
          }
        />
      </FilterGroupCard>
    </div>
  );
}

type PanelProps = FilterChangeProps & {
  open: boolean;
  onClose: () => void;
  monthlyIncome: number;
  excludedCountries: string[];
  favoriteCities: FavoriteCityEntry[];
  onAddExcludedCountry: (country: string) => void;
  onRemoveExcludedCountry: (country: string) => void;
  onClearExcludedCountries: () => void;
  onRemoveFavorite: (city: string, country: string) => void;
};

const FILTER_PANEL_TABS: { id: FilterPanelTab; label: string }[] = [
  { id: "filters", label: "Filters" },
  { id: "exclude", label: "Exclude" },
  { id: "favorites", label: "Favorites" },
  { id: "display", label: "Display" },
];

export function RetirementMapFilters({
  open,
  onClose,
  filters,
  onChange,
  monthlyIncome,
  excludedCountries,
  favoriteCities,
  onAddExcludedCountry,
  onRemoveExcludedCountry,
  onClearExcludedCountries,
  onRemoveFavorite,
}: PanelProps) {
  const [activeTab, setActiveTab] = useState<FilterPanelTab>("filters");
  const activeCount = countActiveMapFilters(filters);
  const showClear = hasNonDefaultMapFilters(filters);
  const excludeTabActive = excludedCountries.length > 0;

  const clearFilters = () => {
    onChange({
      ...DEFAULT_MAP_FILTERS,
      regions: [...ALL_DESTINATION_REGIONS],
    });
  };

  return (
    <aside
      id="wtr-map-filters-panel"
      className={[
        "wtr-map-filters",
        "wtr-map-filters--panel",
        "wtr-map-filters--side",
        open && "wtr-map-filters--open",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Map filters"
      aria-hidden={!open}
    >
      <div className="wtr-map-filters__inner">
      <header className="wtr-map-filters__head">
        <div className="wtr-map-filters__head-copy">
          <h2 className="wtr-map-filters__head-title">Map options</h2>
          {activeTab === "filters" && activeCount > 0 ? (
            <p className="wtr-map-filters__head-active">{activeCount} active</p>
          ) : null}
          {activeTab === "exclude" && excludeTabActive ? (
            <p className="wtr-map-filters__head-active">
              {excludedCountries.length} excluded
            </p>
          ) : null}
          {activeTab === "favorites" && favoriteCities.length > 0 ? (
            <p className="wtr-map-filters__head-active">
              {favoriteCities.length} saved
            </p>
          ) : null}
        </div>
        <CloseButton aria-label="Close filters" onPress={onClose} />
      </header>

      <div
        className="wtr-map-filters__tabs"
        role="tablist"
        aria-label="Filter panel sections"
      >
        {FILTER_PANEL_TABS.map((tab) => (
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
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="wtr-map-filters__scroll">
        <div className="wtr-map-filters__body">
          {activeTab === "filters" ? (
            <FilterControlsStack filters={filters} onChange={onChange} />
          ) : null}

          {activeTab === "exclude" ? (
            <WtrMapFiltersExcludeTab
              excludedCountries={excludedCountries}
              onAddExcludedCountry={onAddExcludedCountry}
              onRemoveExcludedCountry={onRemoveExcludedCountry}
              onClearExcludedCountries={onClearExcludedCountries}
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
        </div>
      </div>

      {activeTab === "filters" && showClear ? (
        <footer className="wtr-map-filters__footer">
          <Button
            variant="ghost"
            size="sm"
            className="wtr-map-filters__clear"
            onPress={clearFilters}
          >
            Clear filters
          </Button>
        </footer>
      ) : null}
      </div>
    </aside>
  );
}
