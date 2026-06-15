import { IconProgressHelp } from "@tabler/icons-react";
import { Popover } from "@heroui/react";
import { useState } from "react";
import { AccordionSection } from "../ui/AccordionSection";
import {
  ALL_CORE_KEYS,
  getFactorDefinition,
} from "../../utils/preferenceFactors";
import "./WtrFitScoreHelpPopout.scss";

function WtrFitScoreHelpContent() {
  return (
    <>
      <p className="wtr-fit-score-help__body font-sm">
        Each destination&apos;s <strong>Fit</strong> score (
        <strong>0–100</strong>) blends cost of living, quality of life,
        affordability, healthcare, climate, and other factors — weighted by your
        Travel Priorities. Update my preferences to adjust them.
      </p>
      <ul
        className="wtr-fit-score-help__factors"
        aria-label="Travel Priorities factors"
      >
        {ALL_CORE_KEYS.map((key) => (
          <li key={key} className="wtr-fit-score-help__factor">
            {getFactorDefinition(key).label}
          </li>
        ))}
      </ul>
    </>
  );
}

export function WtrFitScoreHelpPopout() {
  const [open, setOpen] = useState(false);

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="wtr-fit-score-help-trigger"
        aria-label="How your Fit score works"
      >
        <IconProgressHelp size={24} stroke={1.5} aria-hidden />
      </Popover.Trigger>
      <Popover.Content
        placement="left"
        offset={8}
        shouldFlip
        className="wtr-fit-score-help-popover"
      >
        <Popover.Arrow className="wtr-fit-score-help-popover__arrow" />
        <Popover.Dialog
          className="wtr-fit-score-help-popover__dialog"
          aria-label="How your Fit score works"
        >
          <AccordionSection
            title="How your Fit score works"
            defaultOpen
            className="wtr-fit-score-help-accordion"
            panelClassName="wtr-fit-score-help-accordion__panel"
          >
            <WtrFitScoreHelpContent />
          </AccordionSection>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
