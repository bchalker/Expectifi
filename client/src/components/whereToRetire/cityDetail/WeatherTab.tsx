import type { CityClimate } from '../../../lib/api/openMeteo'
import { ClimateCard } from '../ClimateCard'
import { type CityDetailTabStaggerProps } from './cityDetailTabUtils'

type Props = CityDetailTabStaggerProps & {
  climate: CityClimate | null
  loading: boolean
  failed: boolean
}

export function WeatherTab({ climate, loading, failed, staggerClassName, staggerStyle }: Props) {
  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--weather">
      <ClimateCard
        climate={climate}
        loading={loading}
        failed={failed}
        staggerClassName={staggerClassName}
        staggerStyle={staggerStyle}
      />
    </div>
  )
}
