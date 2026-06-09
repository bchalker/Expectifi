import { Tooltip as HeroTooltip } from '@heroui/react'
import type { ReactNode } from 'react'
import {
  Focusable,
  OverlayArrow,
  Tooltip as AriaTooltip,
  TooltipTrigger,
} from 'react-aria-components'
import './Tooltip.scss'

type Placement = 'top' | 'bottom' | 'left' | 'right'

type Props = {
  children: ReactNode
  /** Tooltip body (plain text or short markup). */
  content: ReactNode
  placement?: Placement
  contentClassName?: string
  triggerClassName?: string
  /** Point at trigger with overlay arrow. */
  showArrow?: boolean
  variant?: 'default' | 'dark'
  /** Hover delay before open (ms). */
  delay?: number
  /** Delay before close (ms). */
  closeDelay?: number
  /** Pass a native control (e.g. button) directly as the trigger — uses HeroUI. */
  nativeTrigger?: boolean
}

const bodyPortal =
  typeof document !== 'undefined' ? document.body : undefined

/**
 * Shared hover/focus tooltip. Native triggers use HeroUI (buttons); inline terms use react-aria.
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
        <HeroTooltip.Trigger className={triggerClass}>{children}</HeroTooltip.Trigger>
        {tooltipContent}
      </HeroTooltip.Root>
    )
  }

  return (
    <TooltipTrigger delay={delay} closeDelay={closeDelay}>
      <Focusable>
        <span
          role="button"
          tabIndex={0}
          className={['app-tooltip__trigger-inner', triggerClass].filter(Boolean).join(' ')}
        >
          {children}
        </span>
      </Focusable>
      <AriaTooltip
        placement={placement}
        offset={showArrow ? 7 : 3}
        className={contentClass}
        UNSTABLE_portalContainer={bodyPortal}
      >
        {showArrow ? <OverlayArrow /> : null}
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  )
}
