import { DestinationGettingThereTab } from '../DestinationGettingThereTab'
import { type CityDetailTabStaggerProps } from './cityDetailTabUtils'

type Props = CityDetailTabStaggerProps & {
  country: string
}

export function GettingThereTab({ country, staggerClassName, staggerStyle }: Props) {
  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--getting-there">
      <DestinationGettingThereTab
        country={country}
        staggerClassName={staggerClassName}
        staggerStyle={staggerStyle}
      />
    </div>
  )
}
