import {
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useAnchoredPanelPosition } from "../../hooks/useAnchoredPanelPosition";
import {
  Button,
  CloseButton,
  Label,
  ListBox,
  Select,
} from "@heroui/react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { firstKeyFromSelectSelection } from "../../lib/dateOfBirthSelect";
import {
  ALL_DESTINATION_REGIONS,
  countActiveMapFilters,
  DEFAULT_MAP_FILTERS,
  hasNonDefaultMapFilters,
  type ClimateFilter,
  type EnglishProficiencyFilter,
  type ForeignTaxFilter,
  type HealthcareFilter,
  type MapFilters,
  type MapSortBy,
  type MaxFlightTimeFilter,
  type MinRetirementScoreFilter,
  type SafetyFilter,
  type VisaFreeDaysFilter,
} from "../../lib/whereToRetire/cityMapScoring";
import "./RetirementMapFilters.scss";

const CLIMATE_OPTIONS: { id: ClimateFilter; label: string }[] = [
  { id: "any", label: "Any climate" },
  { id: "warm-year-round", label: "Warm year-round" },
  { id: "mediterranean", label: "Mediterranean" },
  { id: "tropical", label: "Tropical" },
  { id: "four-seasons", label: "Four seasons" },
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

const FOREIGN_TAX_OPTIONS: { id: ForeignTaxFilter; label: string }[] = [
  { id: "any", label: "Any tax treatment" },
  { id: "not-taxed-locally", label: "Not taxed locally" },
  { id: "low-flat-rate", label: "Low flat rate (under 15%)" },
  { id: "standard", label: "Standard rates apply" },
];

const SORT_OPTIONS: { id: MapSortBy; label: string }[] = [
  { id: "affordability-fit", label: "Best retirement income fit score" },
  { id: "lowest-budget", label: "Lowest monthly budget" },
  { id: "highest-surplus", label: "Highest monthly surplus" },
  { id: "quality-of-life", label: "Best quality of life" },
  { id: "healthcare-access", label: "Best healthcare access" },
  { id: "dollar-strength", label: "Strongest dollar" },
];

const SAFETY_OPTIONS: { id: SafetyFilter; label: string }[] = [
  { id: "any", label: "Any safety level" },
  { id: "reasonably-safe", label: "Reasonably safe (55+)" },
  { id: "very-safe", label: "Very safe (75+)" },
];

const HEALTHCARE_OPTIONS: { id: HealthcareFilter; label: string }[] = [
  { id: "any", label: "Any healthcare" },
  { id: "good-care", label: "Good care available (60+)" },
  { id: "excellent", label: "Excellent healthcare (75+)" },
];

const MAX_FLIGHT_TIME_OPTIONS: { id: MaxFlightTimeFilter; label: string }[] = [
  { id: "any", label: "Any distance" },
  { id: "under-5", label: "Under 5 hours" },
  { id: "under-10", label: "Under 10 hours" },
  { id: "under-15", label: "Under 15 hours" },
];

const VISA_FREE_DAYS_OPTIONS: { id: VisaFreeDaysFilter; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "30-plus", label: "30+ days" },
  { id: "60-plus", label: "60+ days" },
  { id: "90-plus", label: "90+ days" },
  { id: "180-plus", label: "180+ days" },
];

const MIN_RETIREMENT_SCORE_OPTIONS: {
  id: MinRetirementScoreFilter;
  label: string;
}[] = [
  { id: "any", label: "Any score" },
  { id: "good-55", label: "Good fit or better (55+)" },
  { id: "strong-70", label: "Strong fit or better (70+)" },
  { id: "excellent-85", label: "Excellent fit only (85+)" },
];

type FilterChangeProps = {
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
};

function onSwitchKeyDown(event: ReactKeyboardEvent, toggle: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggle();
  }
}

function FilterSwitchCard({
  label,
  subtitle,
  pressed,
  onToggle,
}: {
  label: string;
  subtitle?: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="switch"
      tabIndex={0}
      aria-checked={pressed}
      className={`wtr-map-filters__switch-card${pressed ? " wtr-map-filters__switch-card--on" : ""}`}
      onClick={onToggle}
      onKeyDown={(e) => onSwitchKeyDown(e, onToggle)}
    >
      <div className="wtr-map-filters__switch-card-copy">
        <span className="wtr-map-filters__switch-card-label">{label}</span>
        {subtitle ? (
          <span className="wtr-map-filters__switch-card-sub">{subtitle}</span>
        ) : null}
      </div>
      <span className="wtr-map-filters__native-switch" aria-hidden />
    </div>
  );
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

function englishProficiencyOptionLabel(filter: EnglishProficiencyFilter): string {
  return (
    ENGLISH_PROFICIENCY_OPTIONS.find((opt) => opt.id === filter)?.label ??
    "Any English level"
  );
}

function englishProficiencyTriggerLabel(filter: EnglishProficiencyFilter): string {
  if (filter === "any") return "English";
  return englishProficiencyOptionLabel(filter);
}

function EnglishProficiencySelect({ filters, onChange }: FilterChangeProps) {
  const triggerLabel = englishProficiencyTriggerLabel(filters.englishProficiency);
  const optionLabel = englishProficiencyOptionLabel(filters.englishProficiency);

  return (
    <Select
      className="wtr-map-filters__field wtr-map-filters__english-select"
      variant="secondary"
      aria-label={`English, ${optionLabel}`}
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
      <Label className="wtr-map-filters__field-label">English</Label>
      <Select.Trigger>
        <Select.Value>
          <span
            className={[
              "wtr-map-filters__select-trigger-english",
              filters.englishProficiency !== "any" &&
                "wtr-map-filters__select-trigger-english--filtered",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {triggerLabel}
          </span>
        </Select.Value>
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

function foreignTaxOptionLabel(filter: ForeignTaxFilter): string {
  return (
    FOREIGN_TAX_OPTIONS.find((opt) => opt.id === filter)?.label ??
    "Any tax treatment"
  );
}

function foreignTaxTriggerLabel(filter: ForeignTaxFilter): string {
  if (filter === "any") return "Foreign tax";
  return foreignTaxOptionLabel(filter);
}

function ForeignTaxSelect({ filters, onChange }: FilterChangeProps) {
  const triggerLabel = foreignTaxTriggerLabel(filters.foreignTax);
  const optionLabel = foreignTaxOptionLabel(filters.foreignTax);

  return (
    <Select
      className="wtr-map-filters__field wtr-map-filters__foreign-tax-select"
      variant="secondary"
      aria-label={`Foreign tax, ${optionLabel}`}
      selectedKey={filters.foreignTax}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys);
        if (!id) return;
        onChange({
          ...filters,
          foreignTax: id as ForeignTaxFilter,
        });
      }}
    >
      <Label className="wtr-map-filters__field-label">Foreign tax</Label>
      <Select.Trigger>
        <Select.Value>
          <span
            className={[
              "wtr-map-filters__select-trigger-english",
              filters.foreignTax !== "any" &&
                "wtr-map-filters__select-trigger-english--filtered",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {triggerLabel}
          </span>
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="wtr-map-filters__select-popover">
        <ListBox className="wtr-map-filters__select-list">
          {FOREIGN_TAX_OPTIONS.map((opt) => (
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
      className="wtr-map-filters__field wtr-map-filters__climate-select"
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

function SafetySelect({ filters, onChange }: FilterChangeProps) {
  return (
    <Select
      className="wtr-map-filters__field wtr-map-filters__safety-select"
      variant="secondary"
      aria-label="Safety"
      selectedKey={filters.safety}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys);
        if (!id) return;
        onChange({ ...filters, safety: id as SafetyFilter });
      }}
    >
      <Label className="wtr-map-filters__field-label">Safety</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="wtr-map-filters__select-popover">
        <ListBox className="wtr-map-filters__select-list">
          {SAFETY_OPTIONS.map((opt) => (
            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function HealthcareSelect({ filters, onChange }: FilterChangeProps) {
  return (
    <Select
      className="wtr-map-filters__field wtr-map-filters__healthcare-select"
      variant="secondary"
      aria-label="Healthcare"
      selectedKey={filters.healthcare}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys);
        if (!id) return;
        onChange({ ...filters, healthcare: id as HealthcareFilter });
      }}
    >
      <Label className="wtr-map-filters__field-label">Healthcare</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="wtr-map-filters__select-popover">
        <ListBox className="wtr-map-filters__select-list">
          {HEALTHCARE_OPTIONS.map((opt) => (
            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function MaxFlightTimeSelect({ filters, onChange }: FilterChangeProps) {
  return (
    <Select
      className="wtr-map-filters__field wtr-map-filters__flight-select"
      variant="secondary"
      aria-label="Max flight time"
      selectedKey={filters.maxFlightTime}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys);
        if (!id) return;
        onChange({ ...filters, maxFlightTime: id as MaxFlightTimeFilter });
      }}
    >
      <Label className="wtr-map-filters__field-label">Max flight time</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="wtr-map-filters__select-popover">
        <ListBox className="wtr-map-filters__select-list">
          {MAX_FLIGHT_TIME_OPTIONS.map((opt) => (
            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function VisaFreeDaysSelect({ filters, onChange }: FilterChangeProps) {
  return (
    <Select
      className="wtr-map-filters__field wtr-map-filters__visa-select"
      variant="secondary"
      aria-label="Visa-free stay"
      selectedKey={filters.visaFreeDays}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys);
        if (!id) return;
        onChange({ ...filters, visaFreeDays: id as VisaFreeDaysFilter });
      }}
    >
      <Label className="wtr-map-filters__field-label">Visa-free stay</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="wtr-map-filters__select-popover">
        <ListBox className="wtr-map-filters__select-list">
          {VISA_FREE_DAYS_OPTIONS.map((opt) => (
            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function MinRetirementScoreSelect({ filters, onChange }: FilterChangeProps) {
  return (
    <Select
      className="wtr-map-filters__field wtr-map-filters__min-score-select"
      variant="secondary"
      aria-label="Min retirement score"
      selectedKey={filters.minRetirementScore}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys);
        if (!id) return;
        onChange({
          ...filters,
          minRetirementScore: id as MinRetirementScoreFilter,
        });
      }}
    >
      <Label className="wtr-map-filters__field-label">Min retirement score</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="wtr-map-filters__select-popover">
        <ListBox className="wtr-map-filters__select-list">
          {MIN_RETIREMENT_SCORE_OPTIONS.map((opt) => (
            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
              {opt.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function FilterControlsStack({ filters, onChange }: FilterChangeProps) {
  return (
    <div className="wtr-map-filters__controls">
      <div className="wtr-map-filters__row wtr-map-filters__row--switches">
        {filters.regionScope === "us-only" ? (
          <FilterSwitchCard
            label="Medicare access"
            pressed={filters.medicareAccess}
            onToggle={() =>
              onChange({ ...filters, medicareAccess: !filters.medicareAccess })
            }
          />
        ) : null}
        <FilterSwitchCard
          label="Retirement visa"
          pressed={filters.retirementVisa}
          onToggle={() =>
            onChange({ ...filters, retirementVisa: !filters.retirementVisa })
          }
        />
        <FilterSwitchCard
          label="Hide advisories"
          pressed={filters.hideAdvisories}
          onToggle={() =>
            onChange({ ...filters, hideAdvisories: !filters.hideAdvisories })
          }
        />
      </div>

      <div className="wtr-map-filters__row wtr-map-filters__row--selects">
        <EnglishProficiencySelect filters={filters} onChange={onChange} />
        <ForeignTaxSelect filters={filters} onChange={onChange} />
        <ClimateSelect filters={filters} onChange={onChange} />
      </div>

      <div className="wtr-map-filters__row wtr-map-filters__row--extended">
        <SafetySelect filters={filters} onChange={onChange} />
        <HealthcareSelect filters={filters} onChange={onChange} />
        <div className="wtr-map-filters__toggle-field">
          <span className="wtr-map-filters__field-label">Air quality</span>
          <FilterSwitchCard
            label="Good air only"
            pressed={filters.goodAirOnly}
            onToggle={() =>
              onChange({ ...filters, goodAirOnly: !filters.goodAirOnly })
            }
          />
        </div>
        <MaxFlightTimeSelect filters={filters} onChange={onChange} />
        <div className="wtr-map-filters__toggle-field">
          <span className="wtr-map-filters__field-label">Direct flights</span>
          <FilterSwitchCard
            label="Direct from US only"
            pressed={filters.directFromUsOnly}
            onToggle={() =>
              onChange({
                ...filters,
                directFromUsOnly: !filters.directFromUsOnly,
              })
            }
          />
        </div>
        <VisaFreeDaysSelect filters={filters} onChange={onChange} />
        <MinRetirementScoreSelect filters={filters} onChange={onChange} />
      </div>
    </div>
  );
}

type PanelProps = FilterChangeProps & {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
};

export function RetirementMapFilters({
  open,
  onClose,
  filters,
  onChange,
  anchorRef,
}: PanelProps) {
  const activeCount = countActiveMapFilters(filters);
  const showClear = hasNonDefaultMapFilters(filters);
  const anchorStyle = useAnchoredPanelPosition({ open, anchorRef });

  const clearFilters = () => {
    onChange({
      ...DEFAULT_MAP_FILTERS,
      regions: [...ALL_DESTINATION_REGIONS],
    });
  };

  if (!open) return null;

  return createPortal(
    <aside
      id="wtr-map-filters-panel"
      className="wtr-map-filters wtr-map-filters--panel wtr-map-filters--anchored wtr-map-filters--open"
      style={anchorStyle}
      aria-label="Map filters"
    >
      <header className="wtr-map-filters__head">
        <div className="wtr-map-filters__head-copy">
          <h2 className="wtr-map-filters__head-title">Filters</h2>
          {activeCount > 0 ? (
            <p className="wtr-map-filters__head-active">{activeCount} active</p>
          ) : null}
        </div>
        <CloseButton aria-label="Close filters" onPress={onClose} />
      </header>

      <SimpleBar className="wtr-map-filters__scroll" autoHide={false}>
        <div className="wtr-map-filters__body">
          <FilterControlsStack filters={filters} onChange={onChange} />

          {showClear ? (
            <div className="wtr-map-filters__footer">
              <Button
                variant="ghost"
                size="sm"
                className="wtr-map-filters__clear"
                onPress={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      </SimpleBar>
    </aside>,
    document.body,
  );
}
