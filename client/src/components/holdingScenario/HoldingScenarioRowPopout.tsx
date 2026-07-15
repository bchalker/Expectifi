import { Popover } from '@heroui/react'
import type { ComponentPropsWithRef } from 'react'
import { useAccountScenarioPopoutData } from '../../context/AccountScenarioPopoutDataContext'
import { useScenarioPopout } from '../../context/ScenarioPopoutContext'
import {
  HOLDING_ROW_SCENARIO_SUBLABEL,
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../../lib/holdingScenarioApply'
import type { ImportedPositionRow } from '../../lib/positionsCsv'
import type { HoldingsScenarioTriggerVariant } from '../HoldingsScenarioTrigger'
import { HoldingsScenarioTrigger } from '../HoldingsScenarioTrigger'
import { ScenarioRowPopover } from '../scenario/ScenarioRowPopover'
import { HoldingScenarioPopout } from '../HoldingScenarioPopout'

type Props = {
  symbol: string
  scopeKey: string
  contributingRows: ImportedPositionRow[]
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  inheritAccent?: ScenarioUiChoice | null
  overridesAccountScenario?: boolean
  triggerId?: string
  className?: string
}

/** HeroUI popout anchored left of the holding scenario trigger — matches account scenario popout. */
export function HoldingScenarioRowPopout({
  symbol,
  scopeKey,
  contributingRows,
  label,
  common,
  variant,
  inheritAccent = null,
  overridesAccountScenario = false,
  triggerId,
  className = '',
}: Props) {
  const data = useAccountScenarioPopoutData()
  const { holdingOpen, openHoldingScenario, closeHoldingScenario, isHoldingScenarioOpen } =
    useScenarioPopout()

  const isOpen = isHoldingScenarioOpen(symbol, scopeKey)

  const handleOpenChange = (next: boolean) => {
    if (next) {
      openHoldingScenario({ symbol, scopeKey, contributingRows })
      return
    }
    if (isHoldingScenarioOpen(symbol, scopeKey)) {
      closeHoldingScenario()
    }
  }

  return (
    <ScenarioRowPopover
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      dialogAriaLabel={`Holding scenario for ${symbol}`}
      keepMounted={false}
      trigger={
        <div className={['portfolio-scenario-cell__stack', className].filter(Boolean).join(' ')}>
          <Popover.Trigger
            id={triggerId}
            data-holding-scenario-trigger={symbol}
            render={(triggerProps) => (
              <HoldingsScenarioTrigger
                label={label}
                common={common}
                variant={variant}
                inheritAccent={inheritAccent}
                rowActive={isOpen}
                onOpen={() => openHoldingScenario({ symbol, scopeKey, contributingRows })}
                sublabel={HOLDING_ROW_SCENARIO_SUBLABEL}
                className="portfolio-scenario-cell__trigger"
                triggerSlotProps={triggerProps as ComponentPropsWithRef<'button'>}
              />
            )}
          />
          {overridesAccountScenario ? (
            <span className="portfolio-scenario-cell__override-note">
              Overrides account scenario
            </span>
          ) : null}
        </div>
      }
    >
      <HoldingScenarioPopout
        key={`${scopeKey}-${symbol}-${holdingOpen?.initialTab ?? 'default'}`}
        panelInstanceKey={`${scopeKey}:${symbol}`}
        contributingRows={contributingRows}
        importedPositionRows={data.importedPositionRows}
        inputs={data.inputs}
        setInputs={data.setInputs}
        yearsToRetirement={data.yearsToRetirement}
        retirementCalendarYear={data.retirementCalendarYear}
        retRate={data.retRate}
        brkRate={data.brkRate}
        initialTab={holdingOpen?.symbol === symbol ? holdingOpen.initialTab : undefined}
        onClose={closeHoldingScenario}
        variant="heroui"
      />
    </ScenarioRowPopover>
  )
}
