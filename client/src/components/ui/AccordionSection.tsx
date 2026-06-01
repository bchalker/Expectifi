import { IconChevronDown } from '@tabler/icons-react'
import { useId, useState, type ReactNode } from 'react'
import './AccordionSection.scss'

export type AccordionSectionProps = {
  title: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  panelClassName?: string
}

/** Collapsible section with a single trigger and animated panel. */
export function AccordionSection({
  title,
  children,
  defaultOpen = false,
  className = '',
  panelClassName = '',
}: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <div className={['accordion-section', open && 'accordion-section--open', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="accordion-section__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="accordion-section__trigger-label">{title}</span>
        <IconChevronDown className="accordion-section__chevron" size={16} stroke={1.5} aria-hidden />
      </button>
      <div id={panelId} className={['accordion-section__panel', panelClassName].filter(Boolean).join(' ')}>
        <div className="accordion-section__panel-inner">{children}</div>
      </div>
    </div>
  )
}
