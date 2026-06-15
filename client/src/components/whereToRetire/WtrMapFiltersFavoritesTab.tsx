import { useMemo } from 'react'
import { IconArrowUpRight } from '@tabler/icons-react'
import { buildFavoriteMapRows, formatFavoriteSurplus } from '../../lib/whereToRetire/favoriteMapRows'
import type { MapFilters } from '../../lib/whereToRetire/cityMapScoring'
import type { FavoriteCityEntry } from '../../lib/retirementStorage'
import { sendPrompt } from '../../lib/sendPrompt'
import { CountryFlag } from '../ui/CountryFlag'
import './WtrMapFiltersFavoritesTab.scss'

type Props = {
  favoriteCities: FavoriteCityEntry[]
  monthlyIncome: number
  filters: Pick<MapFilters, 'lifestyle'>
  onRemoveFavorite: (city: string, country: string) => void
}

export function WtrMapFiltersFavoritesTab({
  favoriteCities,
  monthlyIncome,
  filters,
  onRemoveFavorite,
}: Props) {
  const rows = useMemo(
    () => buildFavoriteMapRows(favoriteCities, monthlyIncome, filters),
    [favoriteCities, monthlyIncome, filters],
  )

  if (rows.length === 0) {
    return (
      <p className="wtr-map-favorites__empty">
        No favorites yet. Tap ♡ on any city card to save it here.
      </p>
    )
  }

  return (
    <div className="wtr-map-favorites">
      <ul className="wtr-map-favorites__list">
        {rows.map((row) => (
          <li key={`${row.entry.city}|${row.entry.country}`} className="wtr-map-favorites__row">
            <span className="wtr-map-favorites__row-main">
              <CountryFlag iso={row.iso} size="s" className="wtr-map-favorites__flag" />
              <span className="wtr-map-favorites__label">{row.label}</span>
            </span>
            <span
              className={[
                'wtr-map-favorites__surplus',
                'tabular-nums',
                row.surplus >= 0
                  ? 'wtr-map-favorites__surplus--pos'
                  : 'wtr-map-favorites__surplus--neg',
              ].join(' ')}
            >
              {formatFavoriteSurplus(row.surplus)}
            </span>
            <span
              className={[
                'wtr-map-favorites__tax',
                `wtr-map-favorites__tax--${row.taxTone}`,
              ].join(' ')}
            >
              {row.taxLabel}
            </span>
            <button
              type="button"
              className="wtr-map-favorites__remove"
              onClick={() => onRemoveFavorite(row.entry.city, row.entry.country)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {rows.length >= 2 ? (
        <button
          type="button"
          className="wtr-map-favorites__compare"
          onClick={() =>
            sendPrompt('Compare my favorited retirement destinations side by side')
          }
        >
          Compare favorites
          <IconArrowUpRight size={16} stroke={1.5} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
