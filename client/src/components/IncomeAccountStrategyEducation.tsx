import { IconChevronDown } from '@tabler/icons-react'
import { useEffect, useId, useState } from 'react'
import {
  recommendedAccountIncomeStrategy,
} from '../lib/accountIncomeRecommendation'
import type { AccountScenarioBucketId } from '../lib/accountReturnScenario'
import { renderIncomeTextWithRmdTerms } from './renderIncomeTextWithRmdTerms'
import './IncomeAccountStrategyEducation.scss'

type Props = {
  bucket: AccountScenarioBucketId
  /** Increment when the parent row expands to reset default open accordion. */
  expandGeneration?: number
}

type SectionId = 'dividend' | 'withdraw' | 'both'

type EducationSectionConfig = {
  id: SectionId
  title: string
  paragraphs: string[]
}

const EDUCATION_SECTIONS: EducationSectionConfig[] = [
  {
    id: 'dividend',
    title: 'Why dividend income?',
    paragraphs: [
      'Dividend income lets your principal stay intact and keep compounding while the fund distributions cover your living expenses. A well-chosen dividend fund can generate consistent monthly income without ever selling a share.',
      'Best for accounts with enough balance to cover income needs at a conservative yield (4 to 6 percent). Tax-free accounts like Roth IRA benefit most since distributions are never taxed.',
      'Watch for NAV erosion on high-yield funds. Some funds pay high distributions by slowly returning your own principal, which reduces the balance generating future income.',
    ],
  },
  {
    id: 'withdraw',
    title: 'Why withdraw from principal?',
    paragraphs: [
      'A systematic withdrawal strategy sells shares periodically to generate income. The 4 percent rule is a common starting point, meaning you draw 4 percent of your portfolio annually with inflation adjustments each year.',
      'Best for accounts where dividend yield alone cannot cover income needs, or where strategic draws before RMDs begin can reduce future tax burden. Pre-tax accounts benefit from planned withdrawals between retirement and age 73 to reduce RMD exposure.',
      'Estimated runway is shown above. Drawing at higher rates or from accounts with NAV-eroding funds shortens that runway faster than the rate alone suggests.',
    ],
  },
  {
    id: 'both',
    title: 'Why combine both?',
    paragraphs: [
      'A hybrid strategy uses dividend distributions as baseline cash flow and supplements with principal withdrawals when needed. This can raise monthly income without committing entirely to either approach.',
      'The tradeoff is compounding runway risk. NAV erosion on high-yield funds and rising withdrawal draws can shrink principal faster than either strategy alone. When both are active, monitor estimated principal runway closely and adjust the withdrawal rate if balance declines faster than projected.',
      'Most effective when dividend income covers baseline living expenses and principal draws cover variable or one-time costs.',
    ],
  },
]

function recommendedSectionForBucket(bucket: AccountScenarioBucketId): SectionId {
  return recommendedAccountIncomeStrategy(bucket)
}

function EducationAccordionItem({
  title,
  paragraphs,
  open,
  recommended,
  onToggle,
}: {
  title: string
  paragraphs: string[]
  open: boolean
  recommended: boolean
  onToggle: () => void
}) {
  const panelId = useId()

  return (
    <div
      className={[
        'income-strategy-education__item',
        open ? 'income-strategy-education__item--open' : '',
        recommended ? 'income-strategy-education__item--recommended' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className={[
          'income-strategy-education__trigger',
          open && recommended ? 'income-strategy-education__trigger--recommended-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="income-strategy-education__trigger-label">{title}</span>
        <span className="income-strategy-education__trigger-end">
          {recommended ? (
            <span className="income-strategy-education__pill">Recommended</span>
          ) : null}
          <IconChevronDown className="income-strategy-education__chevron" size={16} stroke={1.5} aria-hidden />
        </span>
      </button>
      <div id={panelId} className="income-strategy-education__panel">
        <div className="income-strategy-education__panel-inner">
          <div className="income-strategy-education__panel-content">
            {paragraphs.map((text) => (
              <div key={text.slice(0, 40)} className="income-strategy-education__p">
                {renderIncomeTextWithRmdTerms(text)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Stacked income strategy education accordions for expanded account rows. */
export function IncomeAccountStrategyEducation({ bucket, expandGeneration = 0 }: Props) {
  const recommendedSectionId = recommendedSectionForBucket(bucket)
  const [openId, setOpenId] = useState<SectionId | null>(() => recommendedSectionId)

  useEffect(() => {
    setOpenId(recommendedSectionId)
  }, [bucket, expandGeneration, recommendedSectionId])

  return (
    <article className="income-strategy-education">
      {EDUCATION_SECTIONS.map((section) => (
        <EducationAccordionItem
          key={section.id}
          title={section.title}
          paragraphs={section.paragraphs}
          open={openId === section.id}
          recommended={section.id === recommendedSectionId}
          onToggle={() => setOpenId((current) => (current === section.id ? null : section.id))}
        />
      ))}
    </article>
  )
}
