import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { AppChip } from '../ui/AppChip'
import { formatUsdOrDash } from '../../utils/costOfLiving'
import './ColCategoryCard.scss'

const ICON_SIZE = 18

export type ColCategoryRowLine = {
  label: string
  value?: string
  note?: string
}

export type ColCategoryRowGroup = {
  title: string
  rows: ColCategoryRowLine[]
}

type HeroCardProps = {
  variant: 'hero'
  title: string
  icon: ReactNode
  headerSubtitle?: string
  headerAmount?: string
  panelTitle?: string
  rows?: ColCategoryRowLine[]
  rowGroups?: ColCategoryRowGroup[]
  footerPill?: ReactNode
  /** Renders before the row at `insertBeforeRowIndex` with dashed divider below. */
  insertBeforeRowIndex?: number
  insertBlock?: ReactNode
  emptyStateNote?: string
}

type RowsCardProps = {
  variant: 'rows'
  title: string
  icon: ReactNode
  subtitle?: string
  rows: ColCategoryRowLine[]
}

export type ColCategoryCardProps = HeroCardProps | RowsCardProps

export function ColCategoryCard(
  props: ColCategoryCardProps & { className?: string; style?: CSSProperties },
) {
  const { title, icon, className, style } = props

  const renderRowLines = (rows: ColCategoryRowLine[], keyPrefix: string) =>
    rows.map((row, rowIndex) => (
      <Fragment key={`${keyPrefix}-${row.label}`}>
        {props.variant === 'hero' &&
        props.insertBlock != null &&
        props.insertBeforeRowIndex != null &&
        rowIndex === props.insertBeforeRowIndex ? (
          <div className="wtr-col-category-card__insert-block">{props.insertBlock}</div>
        ) : null}
        <div
          className={[
            'wtr-col-category-card__row',
            row.value == null && 'wtr-col-category-card__row--label-only',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <dt className="wtr-col-category-card__row-label">
            <span>{row.label}</span>
            {row.note ? (
              <span className="wtr-col-category-card__row-note">{row.note}</span>
            ) : null}
          </dt>
          {row.value != null ? (
            <dd className="wtr-col-category-card__row-value tabular-nums">{row.value}</dd>
          ) : null}
        </div>
      </Fragment>
    ))

  const renderRowGroups = () => {
    if (props.variant !== 'hero' || props.rowGroups == null) return null
    return props.rowGroups.map((group) => (
      <div
        key={group.title}
        className={[
          'wtr-col-category-card__group',
          props.footerPill == null && 'wtr-col-category-card__group--no-footer',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <p className="wtr-col-category-card__group-title">{group.title}</p>
        <dl className="wtr-col-category-card__rows">{renderRowLines(group.rows, group.title)}</dl>
      </div>
    ))
  }

  const renderRows = () => {
    if (props.variant !== 'hero') return null
    if (props.rowGroups != null) return renderRowGroups()
    return (
      <dl className="wtr-col-category-card__rows">
        {renderRowLines(props.rows ?? [], 'row')}
      </dl>
    )
  }

  return (
    <article className={['wtr-col-category-card', className].filter(Boolean).join(' ')} style={style}>
      {props.variant === 'hero' ? (
        <>
          <header className="wtr-col-category-card__head">
            <div className="wtr-col-category-card__head-main">
              <div className="wtr-col-category-card__head-intro">
                <span className="wtr-col-category-card__icon" aria-hidden>
                  {icon}
                </span>
                <div className="wtr-col-category-card__head-text">
                  <h4 className="wtr-col-category-card__title">{title}</h4>
                  {props.headerSubtitle ? (
                    <p className="wtr-col-category-card__header-sub">{props.headerSubtitle}</p>
                  ) : null}
                </div>
              </div>
              {props.headerAmount != null ? (
                <p className="wtr-col-category-card__head-amount tabular-nums">{props.headerAmount}</p>
              ) : null}
            </div>
          </header>

          <div className="wtr-col-category-card__body">
            {props.rowGroups == null ? (
              <div
                className={[
                  'wtr-col-category-card__group',
                  props.footerPill == null && 'wtr-col-category-card__group--no-footer',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {props.panelTitle ? (
                  <p className="wtr-col-category-card__group-title">{props.panelTitle}</p>
                ) : null}
                {renderRows()}
              </div>
            ) : (
              renderRows()
            )}
            {props.footerPill != null ? (
              <div className="wtr-col-category-card__footer-pill">
                {typeof props.footerPill === 'string' ? (
                  <AppChip variant="secondary" color="default">
                    {props.footerPill}
                  </AppChip>
                ) : (
                  props.footerPill
                )}
              </div>
            ) : null}
            {props.emptyStateNote ? (
              <p className="wtr-col-category-card__empty-note">{props.emptyStateNote}</p>
            ) : null}
          </div>
        </>
      ) : null}

      {props.variant === 'rows' ? (
        <>
          <header className="wtr-col-category-card__head">
            <div className="wtr-col-category-card__head-row">
              <span className="wtr-col-category-card__icon" aria-hidden>
                {icon}
              </span>
              <h4 className="wtr-col-category-card__title">{title}</h4>
            </div>
          </header>
          <div className="wtr-col-category-card__body">
            {props.subtitle ? <p className="wtr-col-category-card__subtitle">{props.subtitle}</p> : null}
            <dl className="wtr-col-category-card__rows">
              {props.rows.map((row) => (
                <div key={row.label} className="wtr-col-category-card__row">
                  <dt className="wtr-col-category-card__row-label">
                    <span>{row.label}</span>
                  </dt>
                  {row.value != null ? (
                    <dd className="wtr-col-category-card__row-value tabular-nums">{row.value}</dd>
                  ) : null}
                </div>
              ))}
            </dl>
          </div>
        </>
      ) : null}
    </article>
  )
}

export const COL_CATEGORY_ICON_SIZE = ICON_SIZE

export function formatColCategoryAmount(amount: number): string {
  return formatUsdOrDash(amount)
}
