import type { CSSProperties, ReactNode } from 'react'

export type StackedValueLayout = 'stacked' | 'contents'

export type StackedValueProps = {
  pill: ReactNode
  value: ReactNode
  sub?: ReactNode | null
  /**
   * `stacked` — pill / value / foot in a centered column (e.g. Total at …).
   * `contents` — three siblings only, for parents that use `display: contents` (e.g. strip accordion grid).
   */
  layout?: StackedValueLayout
  className?: string
  pillClassName?: string
  valueClassName?: string
  footClassName?: string
  /** Optional pill typography (maps to inline style; overrides class defaults). */
  pillFontSize?: string
  pillColor?: string
  pillFontWeight?: string | number
  /** Optional value typography. */
  valueFontSize?: string
  valueColor?: string
  valueFontWeight?: string | number
  /** Optional sub/foot caption typography (wraps `sub` so nested captions can inherit). */
  subFontSize?: string
  subColor?: string
  subFontWeight?: string | number
  pillStyle?: CSSProperties
  valueStyle?: CSSProperties
  footStyle?: CSSProperties
}

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

function mergeStyle(a?: CSSProperties, b?: CSSProperties): CSSProperties | undefined {
  if (!a && !b) return undefined
  return { ...(a || {}), ...(b || {}) }
}

function typographyStyle(
  fontSize?: string,
  color?: string,
  fontWeight?: string | number,
): CSSProperties | undefined {
  const o: CSSProperties = {}
  if (fontSize != null) o.fontSize = fontSize
  if (color != null) o.color = color
  if (fontWeight != null) o.fontWeight = fontWeight
  return Object.keys(o).length ? o : undefined
}

export function StackedValue({
  pill,
  value,
  sub = null,
  layout = 'stacked',
  className,
  pillClassName,
  valueClassName = '',
  footClassName = '',
  pillFontSize,
  pillColor,
  pillFontWeight,
  valueFontSize,
  valueColor,
  valueFontWeight,
  subFontSize,
  subColor,
  subFontWeight,
  pillStyle,
  valueStyle,
  footStyle,
}: StackedValueProps) {
  const pillTypography = typographyStyle(pillFontSize, pillColor, pillFontWeight)
  const valueTypography = typographyStyle(valueFontSize, valueColor, valueFontWeight)
  const subTypography = typographyStyle(subFontSize, subColor, subFontWeight)

  const pillEl = (
    <span
      className={cx('strip-total-pill', pillClassName)}
      style={mergeStyle(pillTypography, pillStyle)}
    >
      {pill}
    </span>
  )

  const valueEl = (
    <div
      className={cx('stacked-value__value', valueClassName)}
      style={mergeStyle(valueTypography, valueStyle)}
    >
      {value}
    </div>
  )

  const footBody =
    subTypography != null ? (
      <div className="stacked-value__sub-wrap" style={subTypography}>
        {sub}
      </div>
    ) : (
      sub
    )

  const footEl =
    sub == null ? null : (
      <div className={cx('strip-total-foot', footClassName)} style={footStyle}>
        {footBody}
      </div>
    )

  const stack = (
    <>
      {pillEl}
      {valueEl}
      {footEl}
    </>
  )

  if (layout === 'contents') {
    return <>{stack}</>
  }

  return <div className={cx('stacked-value', className)}>{stack}</div>
}
