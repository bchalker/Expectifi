import { useMemo, useState, type KeyboardEvent } from 'react'
import {
  type ExcludedCountryEntry,
} from '../../lib/retirementStorage'
import type { MapFilters } from '../../lib/whereToRetire/cityMapScoring'
import { getMapCountryCatalog } from '../../lib/whereToRetire/mapCountryCatalog'
import { AccordionSection } from '../ui/AccordionSection'
import { CountryFlag } from '../ui/CountryFlag'
import { WtrFilterToggleBox } from './WtrFilterFieldChrome'
import './WtrMapFiltersExcludeTab.scss'

type Props = {
  filters: MapFilters
  onChange: (filters: MapFilters) => void
  excludedCountryEntries: ExcludedCountryEntry[]
  onAddExcludedCountry: (country: string) => void
  onRemoveExcludedCountry: (country: string) => void
}

const TRAVEL_ADVISORY_EXPLANATION =
  'The US State Department assigns travel advisory levels (1–4) to every country. ' +
  'We auto-hide Level 4 “Do Not Travel” destinations using data from travel.state.gov. ' +
  'You can include any country again with “Include anyway.”'

function countryCountLabel(count: number): string {
  return count === 1 ? '1 country' : `${count} countries`
}

type CountryListProps = {
  entries: ExcludedCountryEntry[]
  countryMeta: Map<string, { name: string; iso: string }>
  onRemoveExcludedCountry: (country: string) => void
  emptyMessage: string
}

function ExcludedCountryList({
  entries,
  countryMeta,
  onRemoveExcludedCountry,
  emptyMessage,
}: CountryListProps) {
  if (entries.length === 0) {
    return <p className="wtr-map-exclude__accordion-empty">{emptyMessage}</p>
  }

  return (
    <ul className="wtr-map-exclude__list">
      {entries.map((entry) => {
        const meta = countryMeta.get(entry.country)
        return (
          <li key={entry.country} className="wtr-map-exclude__entry">
            <div className="wtr-map-exclude__entry-main">
              {meta?.iso ? (
                <CountryFlag
                  iso={meta.iso}
                  size="s"
                  className="wtr-map-exclude__entry-flag"
                />
              ) : null}
              <span className="wtr-map-exclude__entry-name">{entry.country}</span>
            </div>
            <button
              type="button"
              className="wtr-map-exclude__include-btn"
              onClick={() => onRemoveExcludedCountry(entry.country)}
            >
              Include anyway
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function WtrMapFiltersExcludeTab({
  filters,
  onChange,
  excludedCountryEntries,
  onAddExcludedCountry,
  onRemoveExcludedCountry,
}: Props) {
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const catalog = useMemo(() => getMapCountryCatalog(), [])
  const excludedSet = useMemo(
    () => new Set(excludedCountryEntries.map((entry) => entry.country)),
    [excludedCountryEntries],
  )

  const advisoryEntries = useMemo(
    () => excludedCountryEntries.filter((entry) => entry.reason === 'travel_advisory'),
    [excludedCountryEntries],
  )
  const manualEntries = useMemo(
    () => excludedCountryEntries.filter((entry) => entry.reason === 'manual'),
    [excludedCountryEntries],
  )

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return catalog
      .filter((c) => !excludedSet.has(c.name) && c.name.toLowerCase().includes(q))
      .slice(0, 12)
  }, [catalog, excludedSet, query])

  const countryMeta = useMemo(() => {
    return new Map(catalog.map((c) => [c.name, c]))
  }, [catalog])

  const pickCountry = (name: string) => {
    onAddExcludedCountry(name)
    setQuery('')
    setDropdownOpen(false)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    const q = query.trim()
    if (!q) return
    const exact = catalog.find(
      (c) => c.name.toLowerCase() === q.toLowerCase() && !excludedSet.has(c.name),
    )
    if (exact) {
      event.preventDefault()
      pickCountry(exact.name)
      return
    }
    if (suggestions.length === 1) {
      event.preventDefault()
      pickCountry(suggestions[0].name)
    }
  }

  return (
    <div className="wtr-map-exclude">
      <div className="wtr-map-exclude__section">
        <div className="wtr-map-exclude__search-wrap">
          <span className="wtr-map-exclude__label">Exclude countries</span>
          <input
            type="text"
            inputMode="search"
            className="wtr-map-exclude__search"
            placeholder="Search countries..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setDropdownOpen(true)
            }}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setDropdownOpen(false), 150)
            }}
            aria-expanded={dropdownOpen && suggestions.length > 0}
            aria-autocomplete="list"
          />
          {dropdownOpen && suggestions.length > 0 ? (
            <ul className="wtr-map-exclude__dropdown" role="listbox">
              {suggestions.map((opt) => (
                <li key={opt.name} role="presentation">
                  <button
                    type="button"
                    className="wtr-map-exclude__dropdown-item"
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickCountry(opt.name)}
                  >
                    <CountryFlag iso={opt.iso} size="s" />
                    {opt.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <AccordionSection
          className="wtr-map-exclude__accordion"
          title={`You are excluding ${countryCountLabel(manualEntries.length)}`}
          defaultOpen={manualEntries.length > 0}
        >
          <ExcludedCountryList
            entries={manualEntries}
            countryMeta={countryMeta}
            onRemoveExcludedCountry={onRemoveExcludedCountry}
            emptyMessage="You have not manually excluded any countries."
          />
        </AccordionSection>
      </div>

      <div className="wtr-map-exclude__advisory-block">
        <hr className="wtr-map-exclude__separator" aria-hidden />

        <p className="wtr-map-exclude__advisory-intro">{TRAVEL_ADVISORY_EXPLANATION}</p>

        <WtrFilterToggleBox
          className="wtr-map-exclude__level3-toggle"
          label="Also hide Level 3"
          subtitle="increased caution advisories"
          pressed={filters.hideLevel3Cautions}
          onToggle={() =>
            onChange({
              ...filters,
              hideLevel3Cautions: !filters.hideLevel3Cautions,
            })
          }
        />

        <AccordionSection
          className="wtr-map-exclude__accordion"
          title={`Auto excluding ${countryCountLabel(advisoryEntries.length)} by travel advisories`}
          defaultOpen={advisoryEntries.length > 0}
        >
          <ExcludedCountryList
            entries={advisoryEntries}
            countryMeta={countryMeta}
            onRemoveExcludedCountry={onRemoveExcludedCountry}
            emptyMessage="No Level 4 travel-advisory countries are currently hidden."
          />
        </AccordionSection>
      </div>
    </div>
  )
}
