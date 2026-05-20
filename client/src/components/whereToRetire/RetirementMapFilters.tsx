import { type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  Button,
  ButtonGroup,
  Checkbox,
  CloseButton,
  Label,
  ListBox,
  Select,
} from '@heroui/react'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import { firstKeyFromSelectSelection } from '../../lib/dateOfBirthSelect'
import {
  ALL_DESTINATION_REGIONS,
  countActiveMapFilters,
  DEFAULT_MAP_FILTERS,
  hasNonDefaultMapFilters,
  regionsAreDefault,
  type ClimateFilter,
  type DestinationRegion,
  type MapFilters,
  type MapRegionScope,
  type MapSortBy,
} from '../../lib/whereToRetire/cityMapScoring'
import './RetirementMapFilters.scss'

const CLIMATE_OPTIONS: { id: ClimateFilter; label: string }[] = [
  { id: 'any', label: 'Any climate' },
  { id: 'warm-year-round', label: 'Warm year-round' },
  { id: 'mediterranean', label: 'Mediterranean' },
  { id: 'tropical', label: 'Tropical' },
  { id: 'four-seasons', label: 'Four seasons' },
]

const REGION_SCOPE_OPTIONS: { id: MapRegionScope; label: string }[] = [
  { id: 'us-only', label: 'US only' },
  { id: 'international-only', label: 'International' },
  { id: 'both', label: 'Both' },
]

const SORT_OPTIONS: { id: MapSortBy; label: string }[] = [
  { id: 'affordability-fit', label: 'Best retirement income fit score' },
  { id: 'lowest-budget', label: 'Lowest monthly budget' },
  { id: 'highest-surplus', label: 'Highest monthly surplus' },
  { id: 'quality-of-life', label: 'Best quality of life' },
  { id: 'healthcare-access', label: 'Best healthcare access' },
  { id: 'dollar-strength', label: 'Strongest dollar' },
]

const REGION_OPTIONS: { id: DestinationRegion; label: string }[] = [
  { id: 'europe', label: 'Europe' },
  { id: 'latin-america', label: 'Latin America' },
  { id: 'southeast-asia', label: 'Southeast Asia' },
  { id: 'eastern-europe', label: 'Eastern Europe' },
  { id: 'middle-east-africa', label: 'Middle East & Africa' },
]

type FilterChangeProps = {
  filters: MapFilters
  onChange: (filters: MapFilters) => void
}

function toggleRegion(list: DestinationRegion[], id: DestinationRegion): DestinationRegion[] {
  if (list.includes(id)) {
    const next = list.filter((r) => r !== id)
    return next.length ? next : list
  }
  return [...list, id]
}

function regionTriggerLabel(selected: DestinationRegion[]): string {
  if (regionsAreDefault(selected)) return 'All regions'
  if (selected.length === 1) {
    return REGION_OPTIONS.find((opt) => opt.id === selected[0])?.label ?? '1 region'
  }
  return `${selected.length} regions`
}

function onSwitchKeyDown(event: ReactKeyboardEvent, toggle: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggle()
  }
}

function FilterSwitchCard({
  label,
  subtitle,
  pressed,
  onToggle,
}: {
  label: string
  subtitle?: string
  pressed: boolean
  onToggle: () => void
}) {
  return (
    <div
      role="switch"
      tabIndex={0}
      aria-checked={pressed}
      className={`wtr-map-filters__switch-card${pressed ? ' wtr-map-filters__switch-card--on' : ''}`}
      onClick={onToggle}
      onKeyDown={(e) => onSwitchKeyDown(e, onToggle)}
    >
      <div className="wtr-map-filters__switch-card-copy">
        <span className="wtr-map-filters__switch-card-label">{label}</span>
        {subtitle ? <span className="wtr-map-filters__switch-card-sub">{subtitle}</span> : null}
      </div>
      <span className="wtr-map-filters__native-switch" aria-hidden />
    </div>
  )
}

type SortSelectProps = FilterChangeProps & {
  className?: string
}

export function WtrMapSortSelect({ filters, onChange, className }: SortSelectProps) {
  return (
    <Select
      className={['wtr-map-filters__field', 'wtr-map-filters__sort-select', className]
        .filter(Boolean)
        .join(' ')}
      variant="secondary"
      aria-label="Sort by"
      selectedKey={filters.sortBy}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys)
        if (!id) return
        onChange({ ...filters, sortBy: id as MapSortBy })
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
  )
}

function RegionScopeGroup({ filters, onChange }: FilterChangeProps) {
  return (
    <ButtonGroup
      size="sm"
      className="wtr-map-filters__scope-group"
      role="group"
      aria-label="Where to retire"
    >
      {REGION_SCOPE_OPTIONS.map((opt) => (
        <Button
          key={opt.id}
          variant="outline"
          className={filters.regionScope === opt.id ? 'wtr-map-filters__scope-btn--active' : undefined}
          onPress={() => onChange({ ...filters, regionScope: opt.id })}
        >
          {opt.label}
        </Button>
      ))}
    </ButtonGroup>
  )
}

function RegionSelect({
  selected,
  onChange,
}: {
  selected: DestinationRegion[]
  onChange: (regions: DestinationRegion[]) => void
}) {
  return (
    <Select
      className="wtr-map-filters__field wtr-map-filters__region-select"
      variant="secondary"
      aria-label="Region"
    >
      <Label className="wtr-map-filters__field-label">Region</Label>
      <Select.Trigger>
        <Select.Value>{regionTriggerLabel(selected)}</Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="wtr-map-filters__select-popover">
        <ListBox className="wtr-map-filters__select-list wtr-map-filters__region-list" aria-label="Regions">
          {REGION_OPTIONS.map((opt) => {
            const checked = selected.includes(opt.id)
            return (
              <ListBox.Item
                key={opt.id}
                id={opt.id}
                textValue={opt.label}
                onAction={() => onChange(toggleRegion(selected, opt.id))}
              >
                <Checkbox
                  isSelected={checked}
                  className="wtr-map-filters__region-check app-checkbox"
                  aria-label={opt.label}
                >
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>{opt.label}</Checkbox.Content>
                </Checkbox>
              </ListBox.Item>
            )
          })}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

function ClimateSelect({ filters, onChange }: FilterChangeProps) {
  return (
    <Select
      className="wtr-map-filters__field wtr-map-filters__climate-select"
      variant="secondary"
      aria-label="Climate"
      selectedKey={filters.climate}
      onSelectionChange={(keys) => {
        const id = firstKeyFromSelectSelection(keys)
        if (!id) return
        onChange({ ...filters, climate: id as ClimateFilter })
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
  )
}

function FilterControlsStack({ filters, onChange }: FilterChangeProps) {
  return (
    <div className="wtr-map-filters__controls">
      <RegionScopeGroup filters={filters} onChange={onChange} />

      <div className="wtr-map-filters__row wtr-map-filters__row--switches">
        <FilterSwitchCard
          label="English speaking"
          pressed={filters.englishSpeaking}
          onToggle={() => onChange({ ...filters, englishSpeaking: !filters.englishSpeaking })}
        />
        <FilterSwitchCard
          label="Medicare access"
          subtitle="U.S. locations only"
          pressed={filters.medicareAccess}
          onToggle={() => onChange({ ...filters, medicareAccess: !filters.medicareAccess })}
        />
        <FilterSwitchCard
          label="Hide advisories"
          subtitle="Travel advisory destinations"
          pressed={filters.hideAdvisories}
          onToggle={() => onChange({ ...filters, hideAdvisories: !filters.hideAdvisories })}
        />
      </div>

      <div className="wtr-map-filters__row wtr-map-filters__row--pair">
        <RegionSelect
          selected={filters.regions}
          onChange={(regions) => onChange({ ...filters, regions })}
        />
        <ClimateSelect filters={filters} onChange={onChange} />
      </div>
    </div>
  )
}

/** Desktop inline row: scope, toggles, region, climate (sort lives in list panel header). */
export function WtrMapFiltersInline({ filters, onChange }: FilterChangeProps) {
  return (
    <div className="wtr-map-filters wtr-map-filters-inline" aria-label="Map filters">
      <RegionScopeGroup filters={filters} onChange={onChange} />
      <FilterSwitchCard
        label="English speaking"
        pressed={filters.englishSpeaking}
        onToggle={() => onChange({ ...filters, englishSpeaking: !filters.englishSpeaking })}
      />
      <FilterSwitchCard
        label="Medicare access"
        subtitle="U.S. locations only"
        pressed={filters.medicareAccess}
        onToggle={() => onChange({ ...filters, medicareAccess: !filters.medicareAccess })}
      />
      <FilterSwitchCard
        label="Hide advisories"
        subtitle="Travel advisory destinations"
        pressed={filters.hideAdvisories}
        onToggle={() => onChange({ ...filters, hideAdvisories: !filters.hideAdvisories })}
      />
      <RegionSelect
        selected={filters.regions}
        onChange={(regions) => onChange({ ...filters, regions })}
      />
      <ClimateSelect filters={filters} onChange={onChange} />
    </div>
  )
}

type PanelProps = FilterChangeProps & {
  open: boolean
  onClose: () => void
}

export function RetirementMapFilters({ open, onClose, filters, onChange }: PanelProps) {
  const activeCount = countActiveMapFilters(filters)
  const showClear = hasNonDefaultMapFilters(filters)

  const clearFilters = () => {
    onChange({
      ...DEFAULT_MAP_FILTERS,
      regions: [...ALL_DESTINATION_REGIONS],
    })
  }

  return (
    <aside
      id="wtr-map-filters-panel"
      className={`wtr-map-filters wtr-map-filters--panel${open ? ' wtr-map-filters--open' : ''}`}
      aria-label="Map filters"
      aria-hidden={!open}
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
              <Button variant="ghost" size="sm" className="wtr-map-filters__clear" onPress={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      </SimpleBar>
    </aside>
  )
}
