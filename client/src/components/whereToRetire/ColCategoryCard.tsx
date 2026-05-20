import type { CSSProperties, ReactNode } from 'react'
import { IconArrowDownDashed } from '@tabler/icons-react'
import { formatUsdOrDash } from '../../utils/costOfLiving'
import './ColCategoryCard.scss'

const ICON_SIZE = 18

type RowLine = {
  label: string
  value: string
}

type HeroFooterRow = {
  label: string
  value: string
  note?: string
}

type HeroCardProps = {
  variant: 'hero'
  title: string
  icon: ReactNode
  monthlyEstimate: number
  estimateLines: { headline: string; basis: string }
  rows: RowLine[]
  footerRow?: HeroFooterRow
}

type RowsCardProps = {
  variant: 'rows'
  title: string
  icon: ReactNode
  subtitle?: string
  rows: RowLine[]
}

export type ColCategoryCardProps = HeroCardProps | RowsCardProps

export function ColCategoryCard(
  props: ColCategoryCardProps & { className?: string; style?: CSSProperties },
) {
  const { title, icon, className, style } = props

  return (
    <article className={['wtr-col-category-card', className].filter(Boolean).join(' ')} style={style}>
      <header className="wtr-col-category-card__head">
        <div className="wtr-col-category-card__head-row">
          <span className="wtr-col-category-card__icon">{icon}</span>
          <h4 className="wtr-col-category-card__title">{title}</h4>
        </div>
        <span className="wtr-col-category-card__head-arrow" aria-hidden>
          <IconArrowDownDashed size={20} stroke={2} />
        </span>
      </header>

      <div className="wtr-col-category-card__body wtr-col-category-card__body--no-footer">
        {props.variant === 'hero' ? (
          <>
            <div className="wtr-col-category-card__hero">
              <p className="wtr-col-category-card__hero-value">{formatUsdOrDash(props.monthlyEstimate)}</p>
              <p className="wtr-col-category-card__hero-label">
                {props.estimateLines.headline}
                <br />
                {props.estimateLines.basis}
              </p>
            </div>
            <dl className="wtr-col-category-card__rows">
              {props.rows.map((row) => (
                <div key={row.label} className="wtr-col-category-card__row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
            {props.footerRow ? (
              <div className="wtr-col-category-card__food-foot">
                <div className="wtr-col-category-card__food-foot-copy">
                  <p className="wtr-col-category-card__food-foot-label">{props.footerRow.label}</p>
                  {props.footerRow.note ? (
                    <p className="wtr-col-category-card__food-foot-note">{props.footerRow.note}</p>
                  ) : null}
                </div>
                <p className="wtr-col-category-card__food-foot-value">{props.footerRow.value}</p>
              </div>
            ) : null}
          </>
        ) : null}

        {props.variant === 'rows' ? (
          <>
            {props.subtitle ? <p className="wtr-col-category-card__subtitle">{props.subtitle}</p> : null}
            <dl className="wtr-col-category-card__rows">
              {props.rows.map((row) => (
                <div key={row.label} className="wtr-col-category-card__row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
      </div>
    </article>
  )
}

export const COL_CATEGORY_ICON_SIZE = ICON_SIZE
