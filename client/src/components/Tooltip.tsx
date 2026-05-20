import { Tooltip as HeroTooltip } from '@heroui/react'
import type { ReactNode } from 'react'

type Placement = 'top' | 'bottom' | 'left' | 'right'

type Props = {
  children: ReactNode
  /** Tooltip body (plain text or short markup). */
  content: ReactNode
  placement?: Placement
  contentClassName?: string
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
  showArrow = false,
}: Props) {
  const contentClass = ['max-w-[260px] text-xs leading-snug', contentClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <HeroTooltip.Root delay={250} closeDelay={80}>
      <HeroTooltip.Trigger className="inline-flex shrink-0 items-center">
        <span tabIndex={0} className="inline-flex max-w-full min-w-0 cursor-default outline-none">
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
