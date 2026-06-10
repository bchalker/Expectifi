import { DestinationPeopleCultureTab } from '../DestinationPeopleCultureTab'
import { type CityDetailTabStaggerProps } from './cityDetailTabUtils'

type Props = CityDetailTabStaggerProps & {
  country: string
}

export function PeopleAndCultureTab({ country, staggerClassName, staggerStyle }: Props) {
  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--people-culture">
      <DestinationPeopleCultureTab
        country={country}
        staggerClassName={staggerClassName}
        staggerStyle={staggerStyle}
      />
    </div>
  )
}
