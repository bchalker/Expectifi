import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Accordion } from "@heroui/react";
import { IconArrowNarrowRightDashed, IconCheck, IconChevronDown } from "@tabler/icons-react";
import { CurrencyAmountInput } from "./ui/CurrencyAmountInput";
import { ConfigPlanButtonGroup } from "./ConfigPlanButtonGroup";
import { ConfigPlanYearSelect } from "./ConfigPlanYearSelect";
import type {
  LifePlans,
  SellPlanOption,
  InheritanceExpectation,
  HomeOwnershipStatus,
} from "../lib/planStorage/life";
import { saveLifePlans } from "../lib/planStorage/life";
import {
  LIFE_ACCORDION_FAMILY,
  LIFE_ACCORDION_HOME,
  LIFE_ACCORDION_INCOME,
  lifeAccordionMeta,
} from "../lib/lifeTabAccordionMeta";
import "./ConfigPlanButtonGroup.scss";
import "./ConfigPlanYearSelect.scss";
import "./OnboardingFieldShell.scss";
import "./ConfigLifeTab.scss";

type Props = {
  plans: LifePlans;
  onPlansChange: (next: LifePlans) => void;
  currentYear: number;
};

const YES_NO_OPTIONS = [
  { value: "yes" as const, label: "Yes" },
  { value: "no" as const, label: "No" },
];

const TITHE_SLIDE_MS = 280;

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function LifeEventHint({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p className="config-life-tab__life-event-hint" id={id}>
      {children}
    </p>
  );
}

function LifeAccordionTriggerContent({
  title,
  subtitle,
  configured,
}: {
  title: string;
  subtitle: string;
  configured: boolean;
}) {
  return (
    <span className="config-life-tab__accordion-title-wrap">
      <span className="config-life-tab__accordion-title">{title}</span>
      <span className="config-life-tab__accordion-subtitle-row">
        <span className="config-life-tab__accordion-subtitle">{subtitle}</span>
        {configured ? (
          <IconCheck
            className="config-life-tab__accordion-check"
            size={14}
            stroke={2}
            aria-hidden
          />
        ) : null}
      </span>
    </span>
  );
}

function lifeAccordionHeadingClass(configured: boolean) {
  return [
    "config-life-tab__accordion-heading",
    configured && "config-life-tab__accordion-heading--configured",
  ]
    .filter(Boolean)
    .join(" ");
}

function LifeNumberField({
  id,
  label,
  labelId,
  value,
  min,
  max,
  onChange,
  className,
  narrow,
}: {
  id: string;
  label: string;
  labelId: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div
      className={[
        "config-plan-field",
        narrow ? "config-life-tab__vehicles-field" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <label className="config-plan-label" id={labelId} htmlFor={id}>
        {label}
      </label>
      <div
        className={[
          "onboarding-field-shell",
          "config-life-tab__text-shell",
          narrow ? "config-life-tab__text-shell--narrow" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          className="onboarding-field-shell__input"
          value={String(value)}
          aria-labelledby={labelId}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            const next =
              raw === "" ? min : clampInt(parseInt(raw, 10), min, max);
            onChange(next);
          }}
        />
      </div>
    </div>
  );
}

export function ConfigLifeTab({ plans, onPlansChange, currentYear }: Props) {
  const patch = useCallback(
    (partial: Partial<LifePlans>) => {
      const next = saveLifePlans(partial);
      onPlansChange(next);
    },
    [onPlansChange],
  );

  const h = plans.housing;
  const f = plans.family;
  const v = plans.vehicles;
  const o = plans.other;
  const [titheAmountMounted, setTitheAmountMounted] = useState(o.tithes);
  const [titheAmountVisible, setTitheAmountVisible] = useState(o.tithes);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set([LIFE_ACCORDION_HOME]),
  );

  const meta = useMemo(() => lifeAccordionMeta(plans), [plans]);

  useEffect(() => {
    if (o.tithes) {
      setTitheAmountMounted(true);
      const raf = requestAnimationFrame(() => setTitheAmountVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    setTitheAmountVisible(false);
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      setTitheAmountMounted(false);
      return;
    }

    const timer = window.setTimeout(
      () => setTitheAmountMounted(false),
      TITHE_SLIDE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [o.tithes]);

  const yearMax = currentYear + 30;
  const showSellYear = h.planToSell === "Yes" || h.planToSell === "Maybe";
  const isHomeowner = h.ownership !== "rent";

  const setOwnership = (ownership: HomeOwnershipStatus) =>
    patch({
      housing: {
        ...h,
        ownership,
        mortgageBalance: ownership === "mortgage" ? h.mortgageBalance : 0,
      },
    });

  return (
    <div className="config-life-tab">
      <Accordion
        className="config-life-tab__accordion"
        variant="surface"
        expandedKeys={expandedKeys}
        onExpandedChange={(keys) =>
          setExpandedKeys(new Set(keys as Iterable<string>))
        }
      >
        <Accordion.Item
          id={LIFE_ACCORDION_HOME}
          className="config-life-tab__accordion-item"
        >
          <Accordion.Heading className={lifeAccordionHeadingClass(meta.home.configured)}>
            <Accordion.Trigger className="config-life-tab__accordion-trigger">
              <LifeAccordionTriggerContent
                title={meta.home.title}
                subtitle={meta.home.subtitle}
                configured={meta.home.configured}
              />
              <Accordion.Indicator className="config-life-tab__accordion-indicator">
                <span aria-hidden>
                  <IconChevronDown size={16} stroke={1.5} />
                </span>
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="config-life-tab__accordion-body">
              <div className="config-life-tab__panel">
                <div className="config-plan-field">
                  <span className="config-plan-question" id="life-ownership-label">
                    Ownership status
                  </span>
                  <ConfigPlanButtonGroup<HomeOwnershipStatus>
                    ariaLabel="Home ownership"
                    value={h.ownership}
                    onChange={setOwnership}
                    options={[
                      { value: "rent", label: "I rent" },
                      { value: "mortgage", label: "I have a mortgage" },
                      { value: "own", label: "I fully own" },
                    ]}
                  />
                </div>
                {h.ownership === "mortgage" ? (
                  <CurrencyAmountInput
                    id="life-mortgage-balance"
                    label="Mortgage balance remaining"
                    value={h.mortgageBalance}
                    onChange={(mortgageBalance) =>
                      patch({ housing: { ...h, mortgageBalance } })
                    }
                    placeholder="0"
                    externalPrefix
                  />
                ) : null}
                {isHomeowner ? (
                  <>
                    {h.ownership === "mortgage" && h.mortgageBalance > 0 ? (
                      <ConfigPlanYearSelect
                        id="life-mortgage-payoff"
                        label="Estimated payoff year"
                        value={h.mortgagePayoffYear}
                        from={currentYear}
                        to={yearMax}
                        onChange={(mortgagePayoffYear) =>
                          patch({ housing: { ...h, mortgagePayoffYear } })
                        }
                      />
                    ) : null}
                    <div className="config-plan-field">
                      <span
                        className="config-plan-question"
                        id="life-sell-plan-label"
                      >
                        Plans to sell or downsize?
                      </span>
                      <ConfigPlanButtonGroup<SellPlanOption>
                        ariaLabel="Plan to sell home"
                        value={h.planToSell}
                        onChange={(planToSell) =>
                          patch({ housing: { ...h, planToSell } })
                        }
                        options={[
                          { value: "Yes", label: "Yes" },
                          { value: "Maybe", label: "Maybe" },
                          { value: "No", label: "No" },
                        ]}
                      />
                    </div>
                    {showSellYear ? (
                      <div className="config-life-tab__field-group config-life-tab__fade-in">
                        <div className="config-life-tab__field-group-row">
                          <CurrencyAmountInput
                            id="life-sale-proceeds"
                            className="config-life-tab__field-group-main"
                            label="Estimated sale proceeds"
                            value={h.saleProceeds}
                            onChange={(saleProceeds) =>
                              patch({ housing: { ...h, saleProceeds } })
                            }
                            externalPrefix
                          />
                          <ConfigPlanYearSelect
                            id="life-sell-year"
                            className="config-life-tab__field-group-year"
                            label="Rough year you might sell"
                            value={h.sellYear}
                            from={currentYear}
                            to={yearMax}
                            onChange={(sellYear) =>
                              patch({ housing: { ...h, sellYear } })
                            }
                          />
                        </div>
                        <LifeEventHint id="life-sale-proceeds-hint">
                          We'll suggest this as a one-time inflow in your Life
                          Events.
                        </LifeEventHint>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item
          id={LIFE_ACCORDION_FAMILY}
          className="config-life-tab__accordion-item"
        >
          <Accordion.Heading className={lifeAccordionHeadingClass(meta.family.configured)}>
            <Accordion.Trigger className="config-life-tab__accordion-trigger">
              <LifeAccordionTriggerContent
                title={meta.family.title}
                subtitle={meta.family.subtitle}
                configured={meta.family.configured}
              />
              <Accordion.Indicator className="config-life-tab__accordion-indicator">
                <span aria-hidden>
                  <IconChevronDown size={16} stroke={1.5} />
                </span>
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="config-life-tab__accordion-body">
              <div className="config-life-tab__panel">
                <div className="config-plan-field">
                  <span className="config-plan-question" id="life-marital-label">
                    Marital status
                  </span>
                  <ConfigPlanButtonGroup
                    ariaLabel="Marital status"
                    value={f.married ? "married" : "single"}
                    onChange={(v) =>
                      patch({ family: { ...f, married: v === "married" } })
                    }
                    options={[
                      { value: "single", label: "Single" },
                      { value: "married", label: "Married / partnered" },
                    ]}
                  />
                </div>
                <div className="config-plan-field">
                  <span className="config-plan-question" id="life-children-label">
                    Children or grandchildren?
                  </span>
                  <ConfigPlanButtonGroup
                    ariaLabel="Has children or grandchildren"
                    value={f.hasChildren ? "yes" : "no"}
                    onChange={(v) => {
                      const hasChildren = v === "yes";
                      patch({
                        family: {
                          ...f,
                          hasChildren,
                          ...(hasChildren
                            ? {}
                            : { dependentCount: 0, dependentAges: [] }),
                        },
                      });
                    }}
                    options={YES_NO_OPTIONS}
                  />
                </div>
                <div className="config-plan-field">
                  <span
                    className="config-plan-question"
                    id="life-parent-support-label"
                  >
                    Supporting a parent or family member financially?
                  </span>
                  <ConfigPlanButtonGroup
                    ariaLabel="Supporting a parent"
                    value={f.supportingParent ? "yes" : "no"}
                    onChange={(v) => {
                      const supportingParent = v === "yes";
                      patch({
                        family: {
                          ...f,
                          supportingParent,
                          ...(supportingParent
                            ? {}
                            : { parentSupportAmount: 0, parentSupportYears: 5 }),
                        },
                      });
                    }}
                    options={YES_NO_OPTIONS}
                  />
                </div>
              </div>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item
          id={LIFE_ACCORDION_INCOME}
          className="config-life-tab__accordion-item"
        >
          <Accordion.Heading className={lifeAccordionHeadingClass(meta.income.configured)}>
            <Accordion.Trigger className="config-life-tab__accordion-trigger">
              <LifeAccordionTriggerContent
                title={meta.income.title}
                subtitle={meta.income.subtitle}
                configured={meta.income.configured}
              />
              <Accordion.Indicator className="config-life-tab__accordion-indicator">
                <span aria-hidden>
                  <IconChevronDown size={16} stroke={1.5} />
                </span>
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="config-life-tab__accordion-body">
              <div className="config-life-tab__panel">
                <div className="config-plan-field">
                  <span className="config-plan-question" id="life-rental-label">
                    Rental property?
                  </span>
                  <ConfigPlanButtonGroup
                    ariaLabel="Own rental property"
                    value={o.hasRental ? "yes" : "no"}
                    onChange={(v) =>
                      patch({ other: { ...o, hasRental: v === "yes" } })
                    }
                    options={YES_NO_OPTIONS}
                  />
                </div>
                {o.hasRental ? (
                  <div className="config-life-tab__field-group config-life-tab__fade-in">
                    <div className="config-life-tab__field-group-row">
                      <CurrencyAmountInput
                        id="life-rental-income"
                        className="config-life-tab__field-group-main"
                        label="Monthly rental income"
                        value={o.rentalIncome}
                        onChange={(rentalIncome) =>
                          patch({ other: { ...o, rentalIncome } })
                        }
                        externalPrefix
                        externalSuffix="/mo"
                      />
                      <ConfigPlanYearSelect
                        id="life-rental-start"
                        className="config-life-tab__field-group-year"
                        label="When did / will it start?"
                        value={o.rentalStartYear}
                        from={currentYear - 5}
                        to={yearMax}
                        onChange={(rentalStartYear) =>
                          patch({ other: { ...o, rentalStartYear } })
                        }
                      />
                    </div>
                  </div>
                ) : null}
                <div className="config-plan-field">
                  <span
                    className="config-plan-question"
                    id="life-inheritance-label"
                  >
                    Expecting an inheritance?
                  </span>
                  <ConfigPlanButtonGroup<InheritanceExpectation>
                    ariaLabel="Expect inheritance"
                    value={o.expectsInheritance}
                    onChange={(expectsInheritance) =>
                      patch({ other: { ...o, expectsInheritance } })
                    }
                    options={[
                      { value: "Yes", label: "Yes" },
                      { value: "Possibly", label: "Possibly" },
                      { value: "No", label: "No" },
                    ]}
                  />
                </div>
                {o.expectsInheritance !== "No" ? (
                  <div className="config-life-tab__field-group config-life-tab__fade-in">
                    <div className="config-life-tab__field-group-row">
                      <CurrencyAmountInput
                        id="life-inheritance-amt"
                        className="config-life-tab__field-group-main"
                        label="Rough amount (optional)"
                        value={o.inheritanceAmount}
                        onChange={(inheritanceAmount) =>
                          patch({ other: { ...o, inheritanceAmount } })
                        }
                        placeholder="Estimate is fine"
                        externalPrefix
                      />
                      <ConfigPlanYearSelect
                        id="life-inheritance-year"
                        className="config-life-tab__field-group-year"
                        label="Rough year (optional)"
                        value={o.inheritanceYear}
                        from={currentYear}
                        to={yearMax}
                        onChange={(inheritanceYear) =>
                          patch({ other: { ...o, inheritanceYear } })
                        }
                      />
                    </div>
                  </div>
                ) : null}
                <div className="config-plan-field config-life-tab__tithe-field">
                  <span className="config-plan-question" id="life-tithe-label">
                    Tithe or give regularly to charity?
                  </span>
                  <div className="config-life-tab__tithe-controls">
                    <ConfigPlanButtonGroup
                      ariaLabel="Tithes or charity"
                      value={o.tithes ? "yes" : "no"}
                      onChange={(v) =>
                        patch({ other: { ...o, tithes: v === "yes" } })
                      }
                      options={YES_NO_OPTIONS}
                    />
                    {titheAmountMounted ? (
                      <div
                        className={[
                          "config-life-tab__tithe-amount",
                          titheAmountVisible
                            ? "config-life-tab__tithe-amount--visible"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-hidden={!titheAmountVisible}
                      >
                        <span className="config-life-tab__tithe-arrow" aria-hidden>
                          <IconArrowNarrowRightDashed size={16} stroke={1.5} />
                        </span>
                        <CurrencyAmountInput
                          id="life-tithe-amt"
                          className="config-life-tab__tithe-amount-input"
                          label="Monthly giving amount"
                          hideLabel
                          value={o.titheAmount}
                          onChange={(titheAmount) =>
                            patch({ other: { ...o, titheAmount } })
                          }
                          disabled={!o.tithes}
                          externalPrefix
                          externalSuffix="/mo"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
                <LifeNumberField
                  id="life-vehicle-count"
                  labelId="life-vehicle-count-label"
                  label="Vehicles owned"
                  value={v.count}
                  min={0}
                  max={6}
                  narrow
                  onChange={(count) => patch({ vehicles: { ...v, count } })}
                />
                {v.count > 0 ? (
                  <>
                    <LifeEventHint id="life-vehicle-hint">
                      We'll suggest a replacement event in your Life Events when
                      your vehicle is getting long in the tooth.
                    </LifeEventHint>
                    <ConfigPlanYearSelect
                      id="life-oldest-vehicle"
                      className="config-life-tab__fade-in"
                      label="Year of your oldest vehicle"
                      value={v.oldestYear}
                      from={1990}
                      to={currentYear}
                      onChange={(oldestYear) =>
                        patch({ vehicles: { ...v, oldestYear } })
                      }
                    />
                  </>
                ) : null}
              </div>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}
