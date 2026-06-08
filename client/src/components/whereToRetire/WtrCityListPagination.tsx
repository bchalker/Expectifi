import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import './WtrCityListPagination.scss'

type Props = {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  className?: string
  /** Centered copy between prev/next (hides range and page labels). */
  centerNote?: string
  /** Show "1–25 of N" above controls (default true). */
  showRange?: boolean
}

export function WtrCityListPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  className = '',
  centerNote,
  showRange = true,
}: Props) {
  const pageCount = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1
  const safePage = Math.min(page, Math.max(0, pageCount - 1))
  const rangeStart = totalCount === 0 ? 0 : safePage * pageSize + 1
  const rangeEnd = Math.min(totalCount, (safePage + 1) * pageSize)

  const prevDisabled = safePage <= 0
  const nextDisabled = safePage >= pageCount - 1 || totalCount === 0

  const compact = Boolean(centerNote)

  return (
    <nav
      className={[
        'wtr-list-pagination',
        compact && 'wtr-list-pagination--compact',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="City list pages"
    >
      <div
        className={[
          'wtr-list-pagination__controls',
          compact && 'wtr-list-pagination__controls--with-note',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          className="wtr-list-pagination__btn wtr-list-pagination__btn--prev"
          disabled={prevDisabled}
          aria-label="Previous page"
          onClick={() => onPageChange(safePage - 1)}
        >
          <IconChevronLeft size={18} stroke={1.5} aria-hidden />
        </button>
        {compact ? (
          <p className="wtr-list-pagination__center-note">{centerNote}</p>
        ) : (
          <div className="wtr-list-pagination__center">
            <span className="wtr-list-pagination__page-label">
              Page {safePage + 1} of {pageCount}
            </span>
            {showRange ? (
              <p className="wtr-list-pagination__range">
                <span className="wtr-list-pagination__range-nums">
                  {rangeStart}–{rangeEnd}
                </span>{' '}
                of{' '}
                <span className="wtr-list-pagination__range-total">{totalCount}</span>
              </p>
            ) : null}
          </div>
        )}
        <button
          type="button"
          className="wtr-list-pagination__btn wtr-list-pagination__btn--next"
          disabled={nextDisabled}
          aria-label="Next page"
          onClick={() => onPageChange(safePage + 1)}
        >
          <IconChevronRight size={18} stroke={1.5} aria-hidden />
        </button>
      </div>
    </nav>
  )
}
