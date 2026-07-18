import { Popover } from '@heroui/react'
import type { ReactNode } from 'react'
import './ScenarioRowPopover.scss'

export type ScenarioRowPopoverProps = {
  isOpen: boolean
  onOpenChange: (next: boolean) => void
  /** Trigger subtree — must contain the `Popover.Trigger`. */
  trigger: ReactNode
  dialogAriaLabel: string
  /** Keep the content mounted while closed (HeroUI handles visibility/animation). */
  keepMounted?: boolean
  children: ReactNode
}

/** Shared HeroUI popover shell for account + holding scenario rows — identical chrome. */
export function ScenarioRowPopover({
  isOpen,
  onOpenChange,
  trigger,
  dialogAriaLabel,
  keepMounted = true,
  children,
}: ScenarioRowPopoverProps) {
  return (
    <Popover isOpen={isOpen} onOpenChange={onOpenChange}>
      {trigger}
      {keepMounted || isOpen ? (
        <Popover.Content
          placement="left"
          offset={10}
          shouldFlip
          className="scenario-heroui-popover"
        >
          <Popover.Dialog className="scenario-heroui-popover__dialog" aria-label={dialogAriaLabel}>
            {children}
          </Popover.Dialog>
        </Popover.Content>
      ) : null}
    </Popover>
  )
}
