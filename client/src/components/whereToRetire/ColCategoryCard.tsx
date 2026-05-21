import type { CSSProperties, ReactNode } from 'react'
import { formatUsdOrDash } from '../../utils/costOfLiving'
import './ColCategoryCard.scss'

const ICON_SIZE = 18

export type ColCategoryRowLine = {
  label: string
  value?: string
  note?: string
}

type HeroCardProps = {
  variant: 'hero'
  title: string
  icon: ReactNode
  headerSubtitle?: string
  headerAmount?: string
  panelTitle?: string
  rows: ColCategoryRowLine[]
  footerPill?: ReactNode
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

  const renderRows = () => (
    <dl className="wtr-col-category-card__rows">
      {props.variant === 'hero'
        ? props.rows.map((row) => (
            <div
              key={row.label}
              className={[
                'wtr-col-category-card__row',
                row.value == null && 'wtr-col-category-card__row--label-only',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <dt className="wtr-col-category-card__row-label">
                <span>{row.label}</span>
                {row.note ? <span className="wtr-col-category-card__row-note">{row.note}</span> : null}
              </dt>
              {row.value != null ? (
                <dd className="wtr-col-category-card__row-value tabular-nums">{row.value}</dd>
              ) : null}
            </div>
          ))
        : null}
    </dl>
  )

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
            {props.footerPill != null ? (
              <div className="wtr-col-category-card__footer-pill">{props.footerPill}</div>
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
