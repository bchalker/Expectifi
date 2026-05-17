import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { IconSearch, IconX } from '@tabler/icons-react'
import { searchDestinations, type DestinationCatalogEntry } from '../../data/destinations'
import { getScoreForKey } from '../../lib/destinationScorer'
import type { WtrPreferences } from '../../lib/whereToRetire/preferences'
import { DestinationMark } from './DestinationMark'
import './DestinationSearch.scss'

type Props = {
  selectedKeys: string[]
  preferences: WtrPreferences | null
  grossMonthlyIncome: number
  onAdd: (entry: DestinationCatalogEntry) => void
}

export function DestinationSearch({ selectedKeys, preferences, grossMonthlyIncome, onAdd }: Props) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const selectedSet = new Set(selectedKeys)

  const prefsForScore = preferences ?? {
    completed: true,
    skipped: true,
    regionScope: 'both' as const,
    priorities: [],
    dealbreakers: [],
  }

  const results = useMemo(() => {
    return searchDestinations(query)
      .filter((d) => !selectedSet.has(d.key))
      .map((entry) => ({
        entry,
        score: getScoreForKey(entry.key, prefsForScore, grossMonthlyIncome),
      }))
      .sort((a, b) => (b.score?.score ?? 0) - (a.score?.score ?? 0))
  }, [query, selectedSet, prefsForScore, grossMonthlyIncome])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (entry: DestinationCatalogEntry) => {
    if (selectedSet.has(entry.key)) return
    onAdd(entry)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="wtr-search" ref={wrapRef}>
      <div className={`wtr-search__field${open ? ' wtr-search__field--open' : ''}`}>
        <IconSearch size={18} stroke={1.5} className="wtr-search__icon" aria-hidden />
        <input
          id={`${listId}-input`}
          type="text"
          className="wtr-search__input"
          placeholder="Add a destination — search countries or US states…"
          aria-label="Add a destination — search countries or US states"
          value={query}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        {query ? (
          <button
            type="button"
            className="wtr-search__clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
          >
            <IconX size={16} stroke={1.5} aria-hidden />
          </button>
        ) : null}
      </div>

      {open && query.trim() && results.length > 0 ? (
        <ul id={`${listId}-listbox`} className="wtr-search__list" role="listbox">
          {results.map(({ entry }) => (
            <li key={entry.key} role="option">
              <button type="button" className="wtr-search__option" onClick={() => pick(entry)}>
                <span className="wtr-search__option-mark">
                  <DestinationMark entry={entry} />
                </span>
                <span className="wtr-search__option-name">{entry.name}</span>
                {entry.kind === 'us-state' && entry.noIncomeTax ? (
                  <span className="wtr-search__badge">NO INCOME TAX</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

    </div>
  )
}
