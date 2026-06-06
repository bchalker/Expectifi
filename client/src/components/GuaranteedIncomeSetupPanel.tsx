import { useMemo, useState } from 'react'
import { Accordion } from '@heroui/react'
import { IconChevronDown } from '@tabler/icons-react'
import type { CalculatorInputs } from '../lib/computeResults'
import {
  GI_ACCORDION_ANNUITIES,
  GI_ACCORDION_GOVERNMENT,
  GI_ACCORDION_PENSIONS,
  annuitiesAccordionMeta,
  createBlankAnnuityEntry,
  createBlankPensionEntry,
  governmentAccordionMeta,
  guaranteedIncomeEntriesFromInputs,
  partitionGuaranteedIncomeEntries,
  patchInputsFromGuaranteedIncomeEntries,
  pensionsAccordionMeta,
  type GuaranteedIncomeEntry,
} from '../lib/guaranteedIncome'
import { benefitAtClaimAgeFromMonthlyAt67 as ssBenefitAtAge } from '../lib/socialSecurity'
import { GuaranteedIncomeGovernmentSection } from './GuaranteedIncomeGovernmentSection'
import { GuaranteedIncomeNamedEntriesSection } from './GuaranteedIncomeNamedEntriesSection'
import './GuaranteedIncomeSetupPanel.scss'

type Props = {
  inputs: CalculatorInputs
  setInputs: (patch: Partial<CalculatorInputs>) => void
  ssIncluded: boolean
  onSsIncludedChange: (value: boolean) => void
  userBenefitError?: string
}

function AccordionTriggerContent({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <span className="guaranteed-income-setup__accordion-title-wrap">
      <span className="guaranteed-income-setup__accordion-title">{title}</span>
      <span className="guaranteed-income-setup__accordion-subtitle">{subtitle}</span>
    </span>
  )
}

export function GuaranteedIncomeSetupPanel({
  inputs,
  setInputs,
  ssIncluded,
  onSsIncludedChange,
  userBenefitError,
}: Props) {
  const country = inputs.residenceCountry ?? ''
  const entries = useMemo(() => guaranteedIncomeEntriesFromInputs(inputs), [inputs])
  const { pensions, annuities } = useMemo(
    () => partitionGuaranteedIncomeEntries(entries, country),
    [entries, country],
  )

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set([GI_ACCORDION_GOVERNMENT]),
  )

  const govMeta = governmentAccordionMeta(inputs)
  const pensionsMeta = pensionsAccordionMeta(inputs)
  const annuitiesMeta = annuitiesAccordionMeta(inputs)

  const commitEntries = (next: GuaranteedIncomeEntry[]) => {
    setInputs(patchInputsFromGuaranteedIncomeEntries(next, inputs))
  }

  const replaceCategoryEntries = (
    category: 'pensions' | 'annuities',
    categoryEntries: GuaranteedIncomeEntry[],
  ) => {
    const { government } = partitionGuaranteedIncomeEntries(entries, country)
    const other =
      category === 'pensions'
        ? annuities
        : pensions
    commitEntries([...government, ...other, ...categoryEntries])
  }

  const updateEntry = (id: string, patch: Partial<GuaranteedIncomeEntry>) => {
    commitEntries(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const removePension = (id: string) => {
    replaceCategoryEntries(
      'pensions',
      pensions.filter((e) => e.id !== id),
    )
  }

  const removeAnnuity = (id: string) => {
    replaceCategoryEntries(
      'annuities',
      annuities.filter((e) => e.id !== id),
    )
  }

  const addPension = () => {
    replaceCategoryEntries('pensions', [...pensions, createBlankPensionEntry(country)])
    setExpandedKeys(new Set([GI_ACCORDION_PENSIONS]))
  }

  const addAnnuity = () => {
    replaceCategoryEntries('annuities', [...annuities, createBlankAnnuityEntry()])
    setExpandedKeys(new Set([GI_ACCORDION_ANNUITIES]))
  }

  const primaryGovEntry = entries.find((e) => e.type === 'ss' || e.type === 'cpp')

  const onPrimaryBenefitChange = (monthlyAt67: number) => {
    if (!primaryGovEntry) return
    const amountAtClaim = ssBenefitAtAge(monthlyAt67, primaryGovEntry.startAge)
    updateEntry(primaryGovEntry.id, { monthlyAmount: amountAtClaim })
    if (monthlyAt67 > 0 && !ssIncluded) onSsIncludedChange(true)
  }

  const onPrimaryAgeChange = (age: number) => {
    if (!primaryGovEntry) return
    const monthlyAt67 = inputs.ssBenefit67 > 0 ? inputs.ssBenefit67 : 0
    updateEntry(primaryGovEntry.id, {
      startAge: age,
      monthlyAmount: monthlyAt67 > 0 ? ssBenefitAtAge(monthlyAt67, age) : 0,
    })
    setInputs({ ssAge: age })
  }

  return (
    <div className="guaranteed-income-setup">
      <Accordion
        className="guaranteed-income-setup__accordion"
        variant="surface"
        expandedKeys={expandedKeys}
        onExpandedChange={(keys) => setExpandedKeys(new Set(keys as Iterable<string>))}
      >
        <Accordion.Item id={GI_ACCORDION_GOVERNMENT} className="guaranteed-income-setup__accordion-item">
          <Accordion.Heading className="guaranteed-income-setup__accordion-heading">
            <Accordion.Trigger className="guaranteed-income-setup__accordion-trigger">
              <AccordionTriggerContent title={govMeta.title} subtitle={govMeta.subtitle} />
              <Accordion.Indicator className="guaranteed-income-setup__accordion-indicator">
                <IconChevronDown size={16} stroke={1.5} aria-hidden />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="guaranteed-income-setup__accordion-body">
              <GuaranteedIncomeGovernmentSection
                inputs={inputs}
                setInputs={setInputs}
                userBenefitError={userBenefitError}
                onUpdateEntry={updateEntry}
                onPrimaryBenefitChange={onPrimaryBenefitChange}
                onPrimaryAgeChange={onPrimaryAgeChange}
              />
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item id={GI_ACCORDION_PENSIONS} className="guaranteed-income-setup__accordion-item">
          <Accordion.Heading className="guaranteed-income-setup__accordion-heading">
            <Accordion.Trigger className="guaranteed-income-setup__accordion-trigger">
              <AccordionTriggerContent title={pensionsMeta.title} subtitle={pensionsMeta.subtitle} />
              <Accordion.Indicator className="guaranteed-income-setup__accordion-indicator">
                <IconChevronDown size={16} stroke={1.5} aria-hidden />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="guaranteed-income-setup__accordion-body">
              <GuaranteedIncomeNamedEntriesSection
                entries={pensions}
                emptyPrompt="Add a pension if you expect regular monthly income from a former employer."
                addButtonLabel="Add pension"
                namePlaceholder="e.g. State Teachers Pension"
                onAdd={addPension}
                onUpdate={(id, patch) => updateEntry(id, patch)}
                onRemove={removePension}
              />
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item id={GI_ACCORDION_ANNUITIES} className="guaranteed-income-setup__accordion-item">
          <Accordion.Heading className="guaranteed-income-setup__accordion-heading">
            <Accordion.Trigger className="guaranteed-income-setup__accordion-trigger">
              <AccordionTriggerContent title={annuitiesMeta.title} subtitle={annuitiesMeta.subtitle} />
              <Accordion.Indicator className="guaranteed-income-setup__accordion-indicator">
                <IconChevronDown size={16} stroke={1.5} aria-hidden />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="guaranteed-income-setup__accordion-body">
              <GuaranteedIncomeNamedEntriesSection
                entries={annuities}
                emptyPrompt="Add an annuity if you receive or expect to receive fixed monthly payments from an insurance or investment product."
                addButtonLabel="Add annuity"
                namePlaceholder="e.g. TIAA Annuity"
                onAdd={addAnnuity}
                onUpdate={(id, patch) => updateEntry(id, patch)}
                onRemove={removeAnnuity}
              />
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  )
}
