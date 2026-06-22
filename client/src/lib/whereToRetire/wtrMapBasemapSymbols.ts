import type { Map as MapLibreMap } from 'maplibre-gl'

/** City/country/state place labels kept visible while the detail panel is open. */
export const WTR_DETAIL_KEEP_SYMBOL_LAYER_IDS = new Set([
  // Carto Positron
  'place_city_r6',
  'place_city_r5',
  'place_city_dot_r7',
  'place_city_dot_r4',
  'place_city_dot_r2',
  'place_city_dot_z7',
  'place_capital_dot_z7',
  'place_country_1',
  'place_country_2',
  'place_state',
  // OpenFreeMap Bright
  'label_city',
  'label_city_capital',
  'label_country_1',
  'label_country_2',
  'label_country_3',
  'label_state',
])

/** Hide POI/road/water labels in detail view; restore all symbols on panel close. */
export function applyWtrDetailBasemapSymbolVisibility(
  map: MapLibreMap,
  detailPanelOpen: boolean,
): void {
  if (!map.isStyleLoaded()) return

  const layers = map.getStyle()?.layers
  if (!layers) return

  for (const layer of layers) {
    if (layer.type !== 'symbol') continue
    if (!map.getLayer(layer.id)) continue

    const visibility =
      detailPanelOpen && !WTR_DETAIL_KEEP_SYMBOL_LAYER_IDS.has(layer.id)
        ? 'none'
        : 'visible'

    const current = map.getLayoutProperty(layer.id, 'visibility')
    if (current === visibility) continue

    map.setLayoutProperty(layer.id, 'visibility', visibility)
  }
}
