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
  variant?: 'default' | 'dark'
  /** Hover delay before open (ms). */
  delay?: number
  /** Delay before close (ms). */
  closeDelay?: number
  /** Pass a native control (e.g. button) directly to HeroUI Root — no wrapper trigger. */
  nativeTrigger?: boolean
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
  variant = 'default',
  delay = 250,
  closeDelay = 80,
  nativeTrigger = false,
}: Props) {
  const contentClass = [
    'app-tooltip__content',
    variant === 'dark' && 'app-tooltip__content--dark',
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ')
  const triggerClass = ['app-tooltip__trigger', triggerClassName].filter(Boolean).join(' ')

  const tooltipContent = (
    <HeroTooltip.Content placement={placement} showArrow={showArrow} className={contentClass}>
      {content}
      {showArrow ? <HeroTooltip.Arrow /> : null}
    </HeroTooltip.Content>
  )

  if (nativeTrigger) {
    return (
      <HeroTooltip.Root delay={delay} closeDelay={closeDelay}>
        {children}
        {tooltipContent}
      </HeroTooltip.Root>
    )
  }

  return (
    <HeroTooltip.Root delay={delay} closeDelay={closeDelay}>
      <HeroTooltip.Trigger className={triggerClass}>
        <span tabIndex={0} className="app-tooltip__trigger-inner">
          {children}
        </span>
      </HeroTooltip.Trigger>
      {tooltipContent}
    </HeroTooltip.Root>
  )
}
