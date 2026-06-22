import { DestinationPeopleCultureTab } from '../DestinationPeopleCultureTab'
import { type CityDetailTabStaggerProps } from './cityDetailTabUtils'

type Props = CityDetailTabStaggerProps & {
  city: string
  country: string
}

export function PeopleAndCultureTab({ city, country, staggerClassName, staggerStyle }: Props) {
  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--people-culture">
      <DestinationPeopleCultureTab
        city={city}
        country={country}
        staggerClassName={staggerClassName}
        staggerStyle={staggerStyle}
      />
    </div>
  )
}
