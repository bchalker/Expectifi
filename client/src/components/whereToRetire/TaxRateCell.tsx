import { IconCheck } from '@tabler/icons-react'
import {
  taxRatesLastVerifiedMessage,
  type RetirementTaxDetail,
} from '../../data/retirementTaxDetail'
import { DataConfidenceNote } from '../ui/DataConfidenceNote'
import './TaxRateCell.scss'

type Props = {
  detail: RetirementTaxDetail
  isUsState: boolean
  noStateIncomeTax: boolean
}

function useRateHeadlineStyle(headline: string, noStateIncomeTax: boolean): boolean {
  const trimmed = headline.trim()
  if (/^\d+(\.\d+)?%$/.test(trimmed)) return true
  if (trimmed === 'No tax on foreign-sourced income') return true
  return noStateIncomeTax && trimmed === 'No state income tax'
}

export function TaxRateCell({ detail, isUsState, noStateIncomeTax }: Props) {
  const showCheck = isUsState && noStateIncomeTax
  const rateHeadline = useRateHeadlineStyle(detail.localRateHeadline, noStateIncomeTax)

  return (
    <div className="wtr-tax-cell wtr-tax-cell--static">
      <div className="wtr-tax-cell__content">
        <div className="wtr-tax-cell__summary">
          <span className="wtr-tax-cell__hero">
            <span className="wtr-tax-cell__headline-row">
              <span
                className={
                  rateHeadline
                    ? 'wtr-grid__money wtr-grid__money--head wtr-tax-cell__headline'
                    : 'wtr-tax-cell__headline wtr-tax-cell__headline--body'
                }
              >
                {detail.localRateHeadline}
              </span>
              {showCheck ? (
                <IconCheck size={18} stroke={2} className="wtr-tax-cell__check" aria-hidden />
              ) : null}
            </span>
            {detail.localRateSubtitle ? (
              <span className="wtr-tax-cell__subtitle">{detail.localRateSubtitle}</span>
            ) : null}
          </span>
          {detail.lastVerified ? (
            <DataConfidenceNote
              variant="message"
              text={taxRatesLastVerifiedMessage(detail.lastVerified)}
              className="wtr-tax-cell__verified-note"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
