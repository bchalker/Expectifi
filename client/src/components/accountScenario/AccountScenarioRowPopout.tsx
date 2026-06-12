import { Popover } from '@heroui/react'
import type { ComponentPropsWithRef } from 'react'
import type { AccountScenarioBucketId } from '../../lib/accountReturnScenario'
import { useAccountScenarioPopoutData } from '../../context/AccountScenarioPopoutDataContext'
import { useScenarioPopout } from '../../context/ScenarioPopoutContext'
import {
  ACCOUNT_SCENARIO_SUBLABEL,
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../../lib/holdingScenarioApply'
import type { HoldingsScenarioTriggerVariant } from '../HoldingsScenarioTrigger'
import { HoldingsScenarioTrigger } from '../HoldingsScenarioTrigger'
import { AccountScenarioPopout } from './AccountScenarioPopout'
import './AccountScenarioRowPopout.scss'

type Props = {
  bucket: AccountScenarioBucketId
  accountName: string
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  triggerId?: string
  className?: string
}

/** HeroUI popout anchored left of the existing scenario trigger with arrow + motion. */
export function AccountScenarioRowPopout({
  bucket,
  accountName,
  label,
  common,
  variant,
  triggerId,
  className = '',
}: Props) {
  const data = useAccountScenarioPopoutData()
  const { accountOpen, openAccountScenario, closeAccountScenario, isAccountScenarioOpen } =
    useScenarioPopout()

  const isOpen = isAccountScenarioOpen(bucket)

  const handleOpenChange = (next: boolean) => {
    if (next) {
      openAccountScenario(bucket)
      return
    }
    if (isAccountScenarioOpen(bucket)) {
      closeAccountScenario()
    }
  }

  return (
    <Popover isOpen={isOpen} onOpenChange={handleOpenChange}>
      <div className={['portfolio-scenario-cell__stack', className].filter(Boolean).join(' ')}>
        <Popover.Trigger
          id={triggerId}
          data-account-scenario-trigger={bucket}
          render={(triggerProps) => (
            <HoldingsScenarioTrigger
              label={label}
              common={common}
              variant={variant}
              inheritAccent={null}
              rowActive={isOpen}
              onOpen={() => openAccountScenario(bucket)}
              sublabel={ACCOUNT_SCENARIO_SUBLABEL}
              className="portfolio-scenario-cell__trigger"
              triggerSlotProps={triggerProps as ComponentPropsWithRef<'button'>}
            />
          )}
        />
      </div>
      <Popover.Content
        placement="left"
        offset={10}
        shouldFlip
        className="account-scenario-heroui-popover"
      >
        <Popover.Arrow className="account-scenario-heroui-popover__arrow" />
        <Popover.Dialog
          className="account-scenario-heroui-popover__dialog"
          aria-label={`Account scenario for ${accountName}`}
        >
          <AccountScenarioPopout
            key={`${bucket}-${accountOpen?.initialTab ?? 'default'}`}
            accountName={accountName}
            bucket={bucket}
            inputs={data.inputs}
            setInputs={data.setInputs}
            importedPositionRows={data.importedPositionRows}
            yearsToRetirement={data.yearsToRetirement}
            retirementCalendarYear={data.retirementCalendarYear}
            retRate={data.retRate}
            brkRate={data.brkRate}
            initialTab={accountOpen?.bucket === bucket ? accountOpen.initialTab : undefined}
            onClose={closeAccountScenario}
            variant="heroui"
          />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
