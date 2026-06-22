import { DestinationQualityOfLifeTab } from '../DestinationQualityOfLifeTab'
import { type CityDetailTabStaggerProps } from './cityDetailTabUtils'

type Props = CityDetailTabStaggerProps & {
  country: string
}

export function QualityOfLifeTab({ country, staggerClassName, staggerStyle }: Props) {
  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--qol">
      <DestinationQualityOfLifeTab
        country={country}
        staggerClassName={staggerClassName}
        staggerStyle={staggerStyle}
      />
    </div>
  )
}
