import { useEffect, useState } from "react";
import { Accordion } from "@heroui/react";
import { IconChevronDown } from "@tabler/icons-react";
import type { ComputedSnapshot, CalculatorInputs, CalculatorUi, ComputeBalanceModes } from "../lib/computeResults";
import type { PositionReturnModel } from "../lib/positionReturnModel";
import { GlobalGrowthRateSlider } from "./GlobalGrowthRateSlider";
import { GrowthScenarioRangeCard } from "./GrowthScenarioRangeCard";
import {
  RetirementAgeSensitivityOverlay,
  RetirementAgeSensitivityTrigger,
} from "./RetirementAgeSensitivity";
import "./GrowthAssumptionsPanel.scss";
import "./RetirementAgeSensitivity.scss";

const RETURN_EXPECTATIONS_KEY = "return-expectations";
const MOBILE_MQ = "(max-width: 680px)";

function useMobile680() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

type Props = {
  c: ComputedSnapshot;
  inputs: CalculatorInputs;
  ui: CalculatorUi;
  balanceModes: ComputeBalanceModes;
  retRate: number;
  onRetRate: (rate: number) => void;
  brkRate: number;
  mergedRetirementPositionModels: PositionReturnModel[];
  mergedBrokeragePositionModels: PositionReturnModel[];
  targetRetirementAge: number;
  onOpenPositionReturnEditor: (positionId: string) => void;
  onRemovePositionReturn: (positionIds: string[]) => void;
  onOpenGuaranteedIncomeConfig: () => void;
  onTargetRetirementAge: (age: number) => void;
};

export function GrowthAssumptionsPanel({
  c,
  inputs,
  ui,
  balanceModes,
  retRate,
  onRetRate,
  brkRate,
  mergedRetirementPositionModels,
  mergedBrokeragePositionModels,
  targetRetirementAge,
  onOpenPositionReturnEditor,
  onRemovePositionReturn,
  onOpenGuaranteedIncomeConfig,
  onTargetRetirementAge,
}: Props) {
  const isMobile = useMobile680();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [sensitivityOpen, setSensitivityOpen] = useState(false);

  const scenarioCard = (
    <GrowthScenarioRangeCard
      c={c}
      retRate={retRate}
      brkRate={brkRate}
      inputs={inputs}
    />
  );

  return (
    <aside
      className="growth-assumptions-panel"
      aria-label="I expect to grow at"
    >
      <div className="growth-assumptions-panel__main">
        <RetirementAgeSensitivityTrigger
          retirementAge={targetRetirementAge}
          onOpen={() => setSensitivityOpen(true)}
        />

        <GlobalGrowthRateSlider
          className="growth-assumptions-panel__slider"
          retRate={retRate}
          onRetRate={onRetRate}
          mergedRetirementPositionModels={mergedRetirementPositionModels}
          mergedBrokeragePositionModels={mergedBrokeragePositionModels}
          brkRate={brkRate}
          retirementCalendarYear={c.retirementCalendarYear}
          yearsToRetirement={c.yearsToRetirement}
          targetRetirementAge={targetRetirementAge}
          onOpenPositionReturnEditor={onOpenPositionReturnEditor}
          onRemovePositionReturn={onRemovePositionReturn}
          hideDefaultHelperText
          suffixLayout="panel"
        />

        <div className="growth-assumptions-panel__scenario">
          {isMobile ? (
            <Accordion
              className="growth-assumptions-panel__return-expectations"
              variant="surface"
              expandedKeys={expandedKeys}
              onExpandedChange={(keys) =>
                setExpandedKeys(new Set(keys as Iterable<string>))
              }
            >
              <Accordion.Item
                id={RETURN_EXPECTATIONS_KEY}
                className="growth-assumptions-panel__return-expectations-item"
              >
                <Accordion.Heading className="growth-assumptions-panel__return-expectations-heading">
                  <Accordion.Trigger className="growth-assumptions-panel__return-expectations-trigger">
                    Return Expectations
                    <Accordion.Indicator className="growth-assumptions-panel__return-expectations-indicator">
                      <IconChevronDown size={16} stroke={1.5} aria-hidden />
                    </Accordion.Indicator>
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className="growth-assumptions-panel__return-expectations-body">
                    {scenarioCard}
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          ) : (
            scenarioCard
          )}
        </div>
      </div>

      <RetirementAgeSensitivityOverlay
        open={sensitivityOpen}
        onClose={() => setSensitivityOpen(false)}
        inputs={inputs}
        ui={ui}
        balanceModes={balanceModes}
        onOpenGuaranteedIncomeConfig={onOpenGuaranteedIncomeConfig}
        onTargetRetirementAge={onTargetRetirementAge}
      />
    </aside>
  );
}
