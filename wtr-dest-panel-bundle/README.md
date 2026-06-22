# `.wtr-dest-panel` layout bundle

Files for tweaking the Where to Retire **destination detail panel** (map rail, detail column, mobile bottom sheet).

## Layout modes

| Class | Breakpoint | Behavior |
|-------|------------|----------|
| `.wtr-dest-panel--map-rail` | ≥900px | Slides in from the right over the map |
| `.wtr-dest-panel--detail-column` | ≥1919px | Fixed column beside the map (`RetirementMapExplorer` sets `detailColumnLayout`) |
| `.wtr-dest-panel--sheet` | ≤899px | Full-width bottom sheet with drag handle |

## File map

### Shell (BEM block `.wtr-dest-panel`)
- `panel/RetirementDestinationPanel.tsx` — portal, map-rail animation, mounts `CityDetailPanel`
- `panel/RetirementDestinationPanel.scss` — **primary layout CSS** (rail, column, sheet, tabs, cards)

### Inner layout (`.wtr-city-detail`)
- `cityDetail/CityDetailPanel.tsx` — tab nav, scroll regions, footer
- `cityDetail/CityDetailPanel.scss` — inner panel layout; sheet overrides under `.wtr-dest-panel--sheet`
- `cityDetail/CityDetailPanelHeader.tsx` — sticky header (`#wtr-dest-panel-title`)

### Tab content (uses `.wtr-dest-panel__*` card/tab classes)
- `cityDetail/*Tab.tsx` + scss — per-tab bodies
- `tabs/Destination*.tsx` — shared tab sections (tax, QOL, etc.)

### Mobile sheet infrastructure
- `hooks/useWtrDestPanelMobileSheet.ts` → `useMobileBottomSheet` (≤899px MQ)
- `hooks/useBottomSheetDrag.ts` — swipe-to-dismiss
- `ui/BottomSheet*.tsx` + `BottomSheet.scss`

### Parent mount (not included — see repo)
`RetirementMapExplorer.tsx` ~L1044 mounts `<RetirementDestinationPanel detailColumnLayout={…} />` inside `.wtr-explorer__map-row`.

## CSS custom properties

- `--wtr-dest-panel-top` — sticky offset below app chrome
- `--wtr-dest-panel-rail-width` — map rail width (default 40rem @ ≥900px)
- `--wtr-dest-panel-column-width` — detail column (min(46rem, 42vw) @ ≥1919px)
- `--mobile-bottom-sheet-height` / `--mobile-bottom-sheet-z` — sheet sizing

## Related global tokens

Uses `var(--text-*)`, `var(--space-*)`, `var(--surface*)` from `client/src/styles/tokens.css` / `global.scss` (not in this bundle).
