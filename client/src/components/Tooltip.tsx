import { Tooltip as HeroTooltip } from '@heroui/react'
import type { ReactNode } from 'react'
import './Tooltip.scss'

type Placement = 'top' | 'bottom' | 'left' | 'right'

type Props = {
  children: ReactNode
  /** Tooltip body (plain text or short markup). */
  content: ReactNode
  placement?: Placement
  contentClassName?: string
  triggerClassName?: string
  /** Point at trigger with HeroUI overlay arrow. */
  showArrow?: boolean
}

/**
 * Shared hover/focus tooltip (HeroUI + react-aria). Use for icon-only hints such as mode descriptions.
 */
export function Tooltip({
  children,
  content,
  placement = 'top',
  contentClassName,
  triggerClassName,
  showArrow = false,
}: Props) {
  const contentClass = ['app-tooltip__content', contentClassName].filter(Boolean).join(' ')
  const triggerClass = ['app-tooltip__trigger', triggerClassName].filter(Boolean).join(' ')

  return (
    <HeroTooltip.Root delay={250} closeDelay={80}>
      <HeroTooltip.Trigger className={triggerClass}>
        <span tabIndex={0} className="app-tooltip__trigger-inner">
          {children}
        </span>
      </HeroTooltip.Trigger>
      <HeroTooltip.Content placement={placement} showArrow={showArrow} className={contentClass}>
        {content}
        {showArrow ? <HeroTooltip.Arrow /> : null}
      </HeroTooltip.Content>
    </HeroTooltip.Root>
  )
}
