import type { ImpactRating } from './types'
import './ImpactRatingBadge.scss'

export interface ImpactRatingBadgeProps {
  rating: ImpactRating
  isOutflow: boolean
}

export default function ImpactRatingBadge({ rating, isOutflow }: ImpactRatingBadgeProps) {
  return (
    <span
      className={[
        'impact-rating-badge',
        `impact-rating-badge--${rating}`,
        !isOutflow && 'impact-rating-badge--inflow',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${rating} impact`}
    >
      <span className="impact-rating-badge__label">{rating}</span>
    </span>
  )
}
