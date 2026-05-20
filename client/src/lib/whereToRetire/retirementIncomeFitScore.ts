import { formatUsd } from '../../utils/costOfLiving'

export type RetirementIncomeFitTier = 'strong' | 'moderate' | 'stretch' | 'poor'

const TIER_THRESHOLDS = {
  strong: 80,
  moderate: 60,
  stretch: 40,
} as const

/** score = min(100, round((monthlyIncome / monthlyBudget) * 60)) */
export function calculateRetirementIncomeFitScore(
  monthlyIncome: number,
  monthlyBudget: number,
): number {
  if (monthlyBudget <= 0 || monthlyIncome <= 0) return 0
  return Math.min(100, Math.round((monthlyIncome / monthlyBudget) * 60))
}

export function matchRetirementIncomeFitTier(score: number): RetirementIncomeFitTier {
  if (score >= TIER_THRESHOLDS.strong) return 'strong'
  if (score >= TIER_THRESHOLDS.moderate) return 'moderate'
  if (score >= TIER_THRESHOLDS.stretch) return 'stretch'
  return 'poor'
}

export function buildRetirementIncomeFitExplanation(
  monthlyIncome: number,
  score: number,
): string {
  const incomeFmt = formatUsd(monthlyIncome)
  if (score >= 80) return 'Your income goes comfortably far here'
  if (score >= 60) return 'Your income covers typical costs with some left over'
  if (score >= 40) return 'Your income roughly matches costs here. Budget carefully.'
  return `Your ${incomeFmt}/mo may fall short of typical living costs here`
}
