import { formatUsd } from '../../utils/costOfLiving'
import {
  retirementScoreBandFromScore,
  type RetirementScoreBand,
} from '../../utils/retirementScore'

/** @deprecated Use RetirementScoreBand from utils/retirementScore */
export type RetirementIncomeFitTier = RetirementScoreBand

/** Income-only fit (no QoL blend). Prefer calculateRetirementScore when QoL is available. */
export function calculateRetirementIncomeFitScore(
  monthlyIncome: number,
  monthlyBudget: number,
): number {
  if (monthlyBudget <= 0 || monthlyIncome <= 0) return 0
  return Math.min(100, Math.round((monthlyIncome / monthlyBudget) * 50))
}

export function matchRetirementIncomeFitTier(score: number): RetirementScoreBand {
  return retirementScoreBandFromScore(score).band
}

export function buildRetirementIncomeFitExplanation(
  monthlyIncome: number,
  incomeFitScore: number,
): string {
  const incomeFmt = formatUsd(monthlyIncome)
  if (incomeFitScore >= 80) return 'Your income goes comfortably far here'
  if (incomeFitScore >= 60) return 'Your income covers typical costs with some left over'
  if (incomeFitScore >= 40) return 'Your income roughly matches costs here. Budget carefully.'
  return `Your ${incomeFmt}/mo may fall short of typical living costs here`
}
