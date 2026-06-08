import {
  applyWhereToLook,
  MAP_WHERE_TO_LOOK_OPTIONS,
  resolveWhereToLook,
  type MapFilters,
} from '../../lib/whereToRetire/cityMapScoring'
import type { MapPinColorView } from '../../lib/whereToRetire/mapPinDisplay'
import { mapPinViewOptionsForWhereToLook } from '../../lib/whereToRetire/mapPinColorCopy'
import { WtrToolbarSelect } from './WtrToolbarSelect'
import './WtrIncomeToolbarMapSelects.scss'

type Props = {
  pinColorView: MapPinColorView
  onPinColorViewChange: (view: MapPinColorView) => void
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
}

export function WtrIncomeToolbarMapSelects({
  pinColorView,
  onPinColorViewChange,
  filters,
  onFiltersChange,
}: Props) {
  const whereToLook = resolveWhereToLook(filters)
  const pinViewOptions = mapPinViewOptionsForWhereToLook(whereToLook)
  const whereOptions = MAP_WHERE_TO_LOOK_OPTIONS.map((opt) => ({
    ...opt,
    disabled: pinColorView === 'expat' && opt.id === 'us',
  }))

  return (
    <div className="wtr-income-toolbar-map-selects">
      <WtrToolbarSelect
        className="wtr-income-toolbar-map-selects__view"
        layout="hero"
        ariaLabel="Map view"
        value={pinColorView}
        options={pinViewOptions}
        onChange={onPinColorViewChange}
      />
      <WtrToolbarSelect
        className="wtr-income-toolbar-map-selects__where"
        layout="hero"
        ariaLabel="Where to look"
        value={whereToLook}
        options={whereOptions}
        onChange={(choice) =>
          onFiltersChange(applyWhereToLook(filters, choice))
        }
      />
    </div>
  )
}
