import type { ImpactRating } from './types'
import './ImpactRatingBadge.scss'

export interface ImpactRatingBadgeProps {
  rating: ImpactRating
  isOutflow: boolean
}

const BAR_HEIGHTS = [6, 9, 12, 15] as const

function filledBarCount(rating: ImpactRating): number {
  switch (rating) {
    case 'minimal':
      return 1
    case 'light':
      return 1
    case 'moderate':
      return 2
    case 'heavy':
      return 3
    case 'significant':
      return 4
  }
}

function ratingColor(rating: ImpactRating, isOutflow: boolean): string {
  if (!isOutflow) return '#3B6D11'
  if (rating === 'heavy') return '#854F0B'
  if (rating === 'significant') return '#A32D2D'
  return 'var(--color-text-secondary)'
}

export default function ImpactRatingBadge({ rating, isOutflow }: ImpactRatingBadgeProps) {
  const filledCount = filledBarCount(rating)
  const activeColor = ratingColor(rating, isOutflow)

  return (
    <span className="impact-rating-badge" aria-label={`${rating} impact`}>
      <span className="impact-rating-badge__bars" aria-hidden>
        {BAR_HEIGHTS.map((height, index) => (
          <span
            key={height}
            className="impact-rating-badge__bar"
            style={{
              height: `${height}px`,
              backgroundColor:
                index < filledCount
                  ? activeColor
                  : 'var(--color-border-secondary, var(--border))',
            }}
          />
        ))}
      </span>
      <span className="impact-rating-badge__label" style={{ color: activeColor }}>
        {rating}
      </span>
    </span>
  )
}
