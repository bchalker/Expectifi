import { type RefObject } from "react";
import { AnimatedCount } from "../ui/AnimatedCount";
import { BudgetExplorationHero } from "./BudgetExplorationHero";
import { WtrIncomeToolbarMapSelects } from "./WtrIncomeToolbarMapSelects";
import { WtrMapFilterButton } from "./WtrMapFilterButton";
import { WtrFitScoreInfoCard } from "./WtrFitScoreInfoCard";
import type { MapFilters } from "../../lib/whereToRetire/cityMapScoring";
import type { MapPinColorView } from "../../lib/whereToRetire/mapPinDisplay";
import "./WtrFiltersSidebar.scss";

type VisibilityCounts = {
  visibleCount: number;
  visibleCountryCount: number;
};

type Props = {
  planMonthlyIncome: number;
  explorationIncome: number;
  onExplorationIncomeChange: (income: number) => void;
  visibilityCounts: VisibilityCounts;
  pinColorView: MapPinColorView;
  onPinColorViewChange: (view: MapPinColorView) => void;
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  activeFilterCount: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  filterButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenPreferences?: () => void;
};

export function WtrFiltersSidebar({
  planMonthlyIncome,
  explorationIncome,
  onExplorationIncomeChange,
  visibilityCounts,
  pinColorView,
  onPinColorViewChange,
  filters,
  onFiltersChange,
  activeFilterCount,
  filtersOpen,
  onToggleFilters,
  filterButtonRef,
  onOpenPreferences,
}: Props) {
  return (
    <div className="wtr-filters-sidebar">
      <div className="wtr-filters-sidebar__main">
        <div className="wtr-filters-sidebar__intro">
          <BudgetExplorationHero
            section="intro"
            planMonthlyIncome={planMonthlyIncome}
            explorationIncome={explorationIncome}
            onExplorationIncomeChange={onExplorationIncomeChange}
          />
        </div>

        <header className="wtr-filters-sidebar__head">
          <div className="wtr-filters-sidebar__head-copy">
            <h2 className="wtr-filters-sidebar__title">Explore destinations</h2>
            <p
              className="wtr-filters-sidebar__showing-count font-xs"
              aria-live="polite"
            >
              <span className="wtr-filters-sidebar__showing-count-primary">
                <AnimatedCount
                  value={visibilityCounts.visibleCount}
                  className="wtr-filters-sidebar__showing-count-num"
                />{" "}
                cities
              </span>{" "}
              <span className="wtr-filters-sidebar__showing-count-sub">
                from{" "}
                <AnimatedCount
                  value={visibilityCounts.visibleCountryCount}
                  className="wtr-filters-sidebar__showing-count-num wtr-filters-sidebar__showing-count-num--sub"
                />{" "}
                countries
              </span>
            </p>
          </div>
          <WtrMapFilterButton
            ref={filterButtonRef}
            active={activeFilterCount > 0}
            activeFilterCount={activeFilterCount}
            filtersOpen={filtersOpen}
            onToggle={onToggleFilters}
          />
        </header>

        <div className="wtr-filters-sidebar__slider">
          <BudgetExplorationHero
            section="slider-rail"
            planMonthlyIncome={planMonthlyIncome}
            explorationIncome={explorationIncome}
            onExplorationIncomeChange={onExplorationIncomeChange}
          />
        </div>

        <div className="wtr-filters-sidebar__map-controls">
          <div className="wtr-filters-sidebar__selects">
            <WtrIncomeToolbarMapSelects
              pinColorView={pinColorView}
              onPinColorViewChange={onPinColorViewChange}
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          </div>

          {onOpenPreferences ? (
            <>
              <div className="wtr-filters-sidebar__preferences-cta">
                <button
                  type="button"
                  className="wtr-filters-sidebar__preferences-btn"
                  onClick={onOpenPreferences}
                >
                  Update my preferences
                </button>
              </div>
              <WtrFitScoreInfoCard onOpenPreferences={onOpenPreferences} />
            </>
          ) : null}
        </div>
      </div>

      <footer className="wtr-filters-sidebar__footer font-xs" role="note">
        All figures are educational estimates only — not tax, legal, financial, or
        immigration advice. Consult qualified professionals before relocating. Sources:{" "}
        <a
          href="https://www.irs.gov/individuals/international-taxpayers"
          target="_blank"
          rel="noopener noreferrer"
        >
          IRS
        </a>
        {" · "}
        <a
          href="https://taxfoundation.org/data/all/state/state-income-tax-rates/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tax Foundation
        </a>
      </footer>
    </div>
  );
}
