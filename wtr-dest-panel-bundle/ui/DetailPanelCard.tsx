import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import './DetailPanelCard.scss'

type DetailPanelCardProps<T extends ElementType = 'section'> = {
  children: ReactNode
  className?: string
  as?: T
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>

export function DetailPanelCard<T extends ElementType = 'section'>({
  children,
  className,
  as,
  ...rest
}: DetailPanelCardProps<T>) {
  const Tag = (as ?? 'section') as ElementType
  const mergedClassName = ['detail-panel-card', className].filter(Boolean).join(' ')

  return (
    <Tag className={mergedClassName} {...rest}>
      {children}
    </Tag>
  )
}

type DetailPanelCardTitleProps = ComponentPropsWithoutRef<'h3'>

export function DetailPanelCardTitle({ children, className, ...rest }: DetailPanelCardTitleProps) {
  return (
    <h3 className={['detail-panel-card__title', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </h3>
  )
}
