import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";
import type {
  CalculatorInputs,
  CalculatorUi,
  ComputeBalanceModes,
} from "../lib/computeResults";
import { formatMoneyK } from "../lib/displayCurrency";
import {
  computeRetirementAgeSensitivityTable,
  SET_AGE_COLUMN_INDEX,
  type RetirementAgeSensitivityColumn,
  type RetirementAgeSensitivityTable,
} from "../lib/retirementAgeSensitivity";
import { fmt } from "../utils/format";
import "./RetirementAgeSensitivity.scss";

const CLOSE_MS = 150;

type Props = {
  open: boolean;
  onClose: () => void;
  inputs: CalculatorInputs;
  ui: CalculatorUi;
  balanceModes: ComputeBalanceModes;
  onOpenGuaranteedIncomeConfig: () => void;
  onTargetRetirementAge: (age: number) => void;
};

function formatPortfolioDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "−";
  return `${sign}${formatMoneyK(Math.abs(delta))}`;
}

function formatIncomeDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "−";
  return `${sign}${fmt(Math.abs(delta))}/mo`;
}

export function RetirementAgeSensitivityTrigger({
  retirementAge,
  onOpen,
  className,
}: {
  retirementAge: number;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <div
      className={["retirement-sensitivity-trigger", className]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="retirement-sensitivity-trigger__btn"
        onClick={onOpen}
        aria-label={`Til I am ${retirementAge}. Compare other retirement ages.`}
      >
        <span className="growth-slider-label__panel-rate-lead font-xs">
          Until I am
        </span>
        <span className="retirement-sensitivity-trigger__age tabular-nums">
          {retirementAge}
        </span>
        <span className="retirement-sensitivity-trigger__compare">Compare</span>
      </button>
    </div>
  );
}

export function RetirementAgeSensitivityOverlay({
  open,
  onClose,
  inputs,
  ui,
  balanceModes,
  onOpenGuaranteedIncomeConfig,
  onTargetRetirementAge,
}: Props) {
  const [closing, setClosing] = useState(false);
  const [selectedColumnIndex, setSelectedColumnIndex] =
    useState(SET_AGE_COLUMN_INDEX);
  const closeFinishedRef = useRef(false);

  const table = useMemo(
    () => computeRetirementAgeSensitivityTable(inputs, ui, balanceModes),
    [inputs, ui, balanceModes],
  );

  const requestClose = useCallback(() => {
    setClosing((prev) => {
      if (prev) return prev;
      closeFinishedRef.current = false;
      return true;
    });
  }, []);

  useEffect(() => {
    if (open) {
      setClosing(false);
      closeFinishedRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSelectedColumnIndex(SET_AGE_COLUMN_INDEX);
  }, [open, table.setRetirementAge]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, requestClose]);

  const finishClose = useCallback(() => {
    if (closeFinishedRef.current) return;
    closeFinishedRef.current = true;
    setClosing(false);
    onClose();
  }, [onClose]);

  const onBackdropAnimationEnd = (event: AnimationEvent<HTMLButtonElement>) => {
    if (event.target !== event.currentTarget) return;
    if (closing) finishClose();
  };

  const onPanelAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (closing) finishClose();
  };

  const handleBackdropClick = () => {
    requestClose();
  };

  const handleAddSs = () => {
    requestClose();
    window.setTimeout(() => onOpenGuaranteedIncomeConfig(), CLOSE_MS);
  };

  const handleSetAge = (age: number) => {
    onTargetRetirementAge(age);
  };

  const hasPortfolioGoal = table.portfolioGoal > 0;
  const hasIncomeGoal = table.incomeGoal > 0;

  if (!open && !closing) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={[
        "retirement-sensitivity",
        closing && "retirement-sensitivity--closing",
      ]
        .filter(Boolean)
        .join(" ")}
      role="presentation"
    >
      <button
        type="button"
        className="retirement-sensitivity__backdrop"
        aria-label="Close retirement age sensitivity"
        onClick={handleBackdropClick}
        onAnimationEnd={onBackdropAnimationEnd}
      />
      <div
        className="retirement-sensitivity__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="retirement-sensitivity-title"
        onAnimationEnd={onPanelAnimationEnd}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="retirement-sensitivity__header">
          <div className="retirement-sensitivity__header-main">
            <h2
              id="retirement-sensitivity-title"
              className="retirement-sensitivity__title"
            >
              Retirement age sensitivity
            </h2>
            <p className="retirement-sensitivity__subtitle">
              Current age:{" "}
              <strong className="retirement-sensitivity__subtitle-strong tabular-nums">
                {table.setRetirementAge}
              </strong>
            </p>
          </div>
          <button
            type="button"
            className="retirement-sensitivity__close"
            aria-label="Close"
            onClick={requestClose}
          >
            <IconX size={18} strokeWidth={1.5} aria-hidden />
          </button>
        </header>

        <div className="retirement-sensitivity__table-wrap">
          <table className="retirement-sensitivity__table">
            <thead>
              <tr>
                <th
                  className="retirement-sensitivity__label-col"
                  scope="col"
                  aria-hidden
                />
                {table.columns.map((col, columnIndex) => {
                  const isSelected = columnIndex === selectedColumnIndex;
                  const isSetAge = col.isSetAge;
                  return (
                    <th
                      key={`age-${columnIndex}`}
                      scope="col"
                      className={[
                        "retirement-sensitivity__age-col",
                        "retirement-sensitivity__age-col--header",
                        isSetAge && "retirement-sensitivity__age-col--set",
                        isSelected &&
                          !isSetAge &&
                          "retirement-sensitivity__age-col--selected",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <button
                        type="button"
                        className={[
                          "retirement-sensitivity__age-btn",
                          isSetAge && "retirement-sensitivity__age-btn--set",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setSelectedColumnIndex(columnIndex)}
                        aria-pressed={isSelected}
                      >
                        {col.age}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <SensitivityRow
                label="Portfolio"
                table={table}
                selectedColumnIndex={selectedColumnIndex}
                renderCell={(col) => (
                  <span className="retirement-sensitivity__value tabular-nums">
                    {formatMoneyK(col.portfolio)}
                  </span>
                )}
              />
              {hasPortfolioGoal ? (
                <SensitivityRow
                  label="vs goal"
                  table={table}
                  selectedColumnIndex={selectedColumnIndex}
                  variant="goal"
                  renderCell={(col) => (
                    <span
                      className={[
                        "retirement-sensitivity__delta tabular-nums",
                        col.portfolioDelta >= 0
                          ? "retirement-sensitivity__delta--positive"
                          : "retirement-sensitivity__delta--negative",
                      ].join(" ")}
                    >
                      {formatPortfolioDelta(col.portfolioDelta)}
                    </span>
                  )}
                />
              ) : null}
              <SensitivityRow
                label="Monthly income"
                table={table}
                selectedColumnIndex={selectedColumnIndex}
                renderCell={(col) => (
                  <span className="retirement-sensitivity__income tabular-nums">
                    {fmt(Math.round(col.monthlyIncome))}
                  </span>
                )}
              />
              {hasIncomeGoal ? (
                <SensitivityRow
                  label="vs goal"
                  table={table}
                  selectedColumnIndex={selectedColumnIndex}
                  variant="goal"
                  renderCell={(col) => (
                    <span
                      className={[
                        "retirement-sensitivity__delta tabular-nums",
                        col.incomeDelta >= 0
                          ? "retirement-sensitivity__delta--positive"
                          : "retirement-sensitivity__delta--negative",
                      ].join(" ")}
                    >
                      {formatIncomeDelta(col.incomeDelta)}
                    </span>
                  )}
                />
              ) : null}
              <SensitivityRow
                label="Social Security"
                table={table}
                selectedColumnIndex={selectedColumnIndex}
                renderCell={(col) =>
                  table.ssConfigured ? (
                    col.ssMonthly != null ? (
                      <span className="retirement-sensitivity__ss tabular-nums">
                        {fmt(col.ssMonthly)}
                      </span>
                    ) : (
                      <span className="retirement-sensitivity__dash">—</span>
                    )
                  ) : (
                    <button
                      type="button"
                      className="retirement-sensitivity__add-btn"
                      onClick={handleAddSs}
                    >
                      Add →
                    </button>
                  )
                }
              />
              <SensitivityRow
                label="Each year adds"
                table={table}
                selectedColumnIndex={selectedColumnIndex}
                renderCell={(col) =>
                  col.yearlyIncomeGain != null ? (
                    <span className="retirement-sensitivity__yearly-gain tabular-nums">
                      +{fmt(col.yearlyIncomeGain)}/mo
                    </span>
                  ) : (
                    <span className="retirement-sensitivity__dash">—</span>
                  )
                }
              />
            </tbody>
            <tfoot>
              <tr className="retirement-sensitivity__set-row">
                <th
                  className="retirement-sensitivity__label-col"
                  scope="row"
                  aria-hidden
                />
                {table.columns.map((col, columnIndex) => {
                  const isSelected = columnIndex === selectedColumnIndex;
                  const isSetAge = col.isSetAge;
                  return (
                    <td
                      key={`set-${columnIndex}`}
                      className={[
                        "retirement-sensitivity__age-col",
                        "retirement-sensitivity__age-col--footer",
                        isSetAge && "retirement-sensitivity__age-col--set",
                        isSelected &&
                          !isSetAge &&
                          "retirement-sensitivity__age-col--selected",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {isSetAge ? null : (
                        <button
                          type="button"
                          className="retirement-sensitivity__set-btn"
                          onClick={() => handleSetAge(col.age)}
                        >
                          Set
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SensitivityRow({
  label,
  table,
  selectedColumnIndex,
  variant,
  renderCell,
}: {
  label: string;
  table: RetirementAgeSensitivityTable;
  selectedColumnIndex: number;
  variant?: "goal";
  renderCell: (col: RetirementAgeSensitivityColumn) => ReactNode;
}) {
  return (
    <tr
      className={[
        "retirement-sensitivity__row",
        variant === "goal" && "retirement-sensitivity__row--goal",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <th
        scope="row"
        className={[
          "retirement-sensitivity__label-col",
          variant === "goal" && "retirement-sensitivity__label-col--goal",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </th>
      {table.columns.map((col, columnIndex) => {
        const isSelected = columnIndex === selectedColumnIndex;
        const isSetAge = col.isSetAge;
        return (
          <td
            key={`${label}-${columnIndex}`}
            className={[
              "retirement-sensitivity__age-col",
              variant === "goal" && "retirement-sensitivity__age-col--goal",
              isSetAge && "retirement-sensitivity__age-col--set",
              isSelected &&
                !isSetAge &&
                "retirement-sensitivity__age-col--selected",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {renderCell(col)}
          </td>
        );
      })}
    </tr>
  );
}
