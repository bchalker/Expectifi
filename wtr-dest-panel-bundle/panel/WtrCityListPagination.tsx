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
  /** When set, prev/next advance one city row instead of a page. */
  itemIndex?: number
  onItemPrev?: () => void
  onItemNext?: () => void
}

export function WtrCityListPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  className = '',
  centerNote,
  showRange = true,
  itemIndex,
  onItemPrev,
  onItemNext,
}: Props) {
  const itemNav =
    itemIndex != null && onItemPrev != null && onItemNext != null
  const pageCount = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1
  const safePage = Math.min(page, Math.max(0, pageCount - 1))
  const rangeStart = totalCount === 0 ? 0 : safePage * pageSize + 1
  const rangeEnd = Math.min(totalCount, (safePage + 1) * pageSize)
  const safeItemIndex =
    itemIndex == null ? 0 : Math.min(itemIndex, Math.max(0, totalCount - 1))

  const prevDisabled = itemNav
    ? safeItemIndex <= 0 || totalCount === 0
    : safePage <= 0
  const nextDisabled = itemNav
    ? safeItemIndex >= totalCount - 1 || totalCount === 0
    : safePage >= pageCount - 1 || totalCount === 0

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
      aria-label={itemNav ? 'City list navigation' : 'City list pages'}
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
          aria-label={itemNav ? 'Previous city' : 'Previous page'}
          onClick={() =>
            itemNav ? onItemPrev() : onPageChange(safePage - 1)
          }
        >
          <IconChevronLeft size={18} stroke={1.5} aria-hidden />
        </button>
        {compact ? (
          <p className="wtr-list-pagination__center-note">{centerNote}</p>
        ) : (
          <div className="wtr-list-pagination__center">
            <span className="wtr-list-pagination__page-label">
              {itemNav
                ? `${safeItemIndex + 1} of ${totalCount}`
                : `Page ${safePage + 1} of ${pageCount}`}
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
          aria-label={itemNav ? 'Next city' : 'Next page'}
          onClick={() =>
            itemNav ? onItemNext() : onPageChange(safePage + 1)
          }
        >
          <IconChevronRight size={18} stroke={1.5} aria-hidden />
        </button>
      </div>
    </nav>
  )
}
