import { useMemo, useState } from 'react'
import { getMapCountryCatalog } from '../../lib/whereToRetire/mapCountryCatalog'
import { CountryFlag } from '../ui/CountryFlag'
import { WtrExcludeCountryIcon } from './WtrExcludeCountryIcon'
import './WtrMapFiltersExcludeTab.scss'

type Props = {
  excludedCountries: string[]
  onAddExcludedCountry: (country: string) => void
  onRemoveExcludedCountry: (country: string) => void
  onClearExcludedCountries: () => void
}

export function WtrMapFiltersExcludeTab({
  excludedCountries,
  onAddExcludedCountry,
  onRemoveExcludedCountry,
  onClearExcludedCountries,
}: Props) {
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const catalog = useMemo(() => getMapCountryCatalog(), [])
  const excludedSet = useMemo(() => new Set(excludedCountries), [excludedCountries])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return catalog
      .filter((c) => !excludedSet.has(c.name) && c.name.toLowerCase().includes(q))
      .slice(0, 12)
  }, [catalog, excludedSet, query])

  const countryToExclude = useMemo(() => {
    const q = query.trim()
    if (!q) return null
    const exact = catalog.find(
      (c) => c.name.toLowerCase() === q.toLowerCase() && !excludedSet.has(c.name),
    )
    if (exact) return exact.name
    if (suggestions.length === 1) return suggestions[0].name
    return null
  }, [catalog, excludedSet, query, suggestions])

  const countryMeta = useMemo(() => {
    const map = new Map(catalog.map((c) => [c.name, c]))
    return map
  }, [catalog])

  const pickCountry = (name: string) => {
    onAddExcludedCountry(name)
    setQuery('')
    setDropdownOpen(false)
  }

  return (
    <div className="wtr-map-exclude">
      <div className="wtr-map-exclude__section">
        <div className="wtr-map-exclude__search-wrap">
          <span className="wtr-map-exclude__label">Exclude countries</span>
          <div className="wtr-map-exclude__search-row">
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
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setDropdownOpen(false), 150)
              }}
              aria-expanded={dropdownOpen && suggestions.length > 0}
              aria-autocomplete="list"
            />
            <WtrExcludeCountryIcon
              country={countryToExclude ?? (query.trim() || 'country')}
              disabled={!countryToExclude}
              onExclude={() => {
                if (countryToExclude) pickCountry(countryToExclude)
              }}
            />
          </div>
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

        <p className="wtr-map-exclude__subhead">Excluded countries</p>
        {excludedCountries.length === 0 ? (
          <p className="wtr-map-exclude__empty">
            No countries excluded. Use search to exclude countries from your results.
          </p>
        ) : (
          <>
            <div className="wtr-map-exclude__pills">
              {excludedCountries.map((name) => {
                const meta = countryMeta.get(name)
                return (
                  <button
                    key={name}
                    type="button"
                    className="wtr-map-exclude__pill"
                    onClick={() => onRemoveExcludedCountry(name)}
                    aria-label={`Remove ${name} from exclusions`}
                  >
                    {meta?.iso ? (
                      <CountryFlag iso={meta.iso} size="s" className="wtr-map-exclude__pill-flag" />
                    ) : null}
                    <span>{name}</span>
                    <span className="wtr-map-exclude__pill-x" aria-hidden>
                      ×
                    </span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="wtr-map-exclude__clear-link"
              onClick={onClearExcludedCountries}
            >
              Clear all exclusions
            </button>
          </>
        )}
      </div>
    </div>
  )
}
