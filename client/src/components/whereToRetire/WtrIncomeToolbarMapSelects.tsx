import {
  applyWhereToLook,
  MAP_WHERE_TO_LOOK_OPTIONS,
  resolveWhereToLook,
  type MapFilters,
} from '../../lib/whereToRetire/cityMapScoring'
import type { MapPinColorView } from '../../lib/whereToRetire/mapPinDisplay'
import { WtrToolbarSelect } from './WtrToolbarSelect'
import './WtrIncomeToolbarMapSelects.scss'

type Props = {
  pinColorView: MapPinColorView
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
}

export function WtrIncomeToolbarMapSelects({
  pinColorView,
  filters,
  onFiltersChange,
}: Props) {
  const whereToLook = resolveWhereToLook(filters)
  const whereOptions = MAP_WHERE_TO_LOOK_OPTIONS.map((opt) => ({
    ...opt,
    disabled: pinColorView === 'expat' && opt.id === 'us',
  }))

  return (
    <div className="wtr-income-toolbar-map-selects">
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
