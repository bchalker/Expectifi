import { DestinationExpatLifeTab } from '../DestinationExpatLifeTab'
import { type CityDetailTabStaggerProps } from './cityDetailTabUtils'

type Props = CityDetailTabStaggerProps & {
  city: string
  country: string
}

export function ExpatLifeTab({ city, country, staggerClassName, staggerStyle }: Props) {
  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--expat-life">
      <DestinationExpatLifeTab
        city={city}
        country={country}
        staggerClassName={staggerClassName}
        staggerStyle={staggerStyle}
      />
    </div>
  )
}
