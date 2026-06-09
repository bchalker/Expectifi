import type { LifePlans, LifePlansFamily, LifePlansHousing, LifePlansOther, LifePlansVehicles } from './planStorage/life'
import { fmtMon } from '../utils/format'

export const LIFE_ACCORDION_HOME = 'life-home'
export const LIFE_ACCORDION_FAMILY = 'life-family'
export const LIFE_ACCORDION_INCOME = 'life-income'

function ownershipLabel(ownership: LifePlansHousing['ownership']): string {
  if (ownership === 'rent') return 'Renting'
  if (ownership === 'mortgage') return 'Mortgage'
  return 'Fully owned'
}

function sellPlanLabel(h: LifePlansHousing): string {
  if (h.planToSell === 'No') return 'Not selling'
  if (h.planToSell === 'Yes') return `Selling in ${h.sellYear}`
  return `Selling maybe in ${h.sellYear}`
}

export function homeAccordionSubtitle(h: LifePlansHousing): string {
  const ownership = ownershipLabel(h.ownership)
  if (h.ownership === 'rent') return ownership
  return `${ownership} · ${sellPlanLabel(h)}`
}

function maritalLabel(married: boolean): string {
  return married ? 'Married' : 'Single'
}

function dependentsLabel(f: LifePlansFamily): string {
  if (!f.hasChildren) return 'No dependents'
  if (f.dependentCount > 0) {
    return f.dependentCount === 1 ? '1 child' : `${f.dependentCount} children`
  }
  return 'Has dependents'
}

export function familyAccordionSubtitle(f: LifePlansFamily): string {
  const marital = maritalLabel(f.married)
  if (f.supportingParent) return `${marital} · Supporting a parent`
  return `${marital} · ${dependentsLabel(f)}`
}

function inheritanceLabel(expectation: LifePlansOther['expectsInheritance']): string {
  if (expectation === 'Yes') return 'Inheritance expected'
  if (expectation === 'Possibly') return 'Inheritance possible'
  return 'No inheritance'
}

function vehiclesLabel(count: number): string {
  if (count === 1) return '1 vehicle'
  return `${count} vehicles`
}

export function incomeAccordionSubtitle(o: LifePlansOther, v: LifePlansVehicles): string {
  const rental = o.hasRental ? `Rental ${fmtMon(o.rentalIncome)}` : 'No rental'
  const inheritance = inheritanceLabel(o.expectsInheritance)
  const vehicles = vehiclesLabel(v.count)
  return `${rental} · ${inheritance} · ${vehicles}`
}

export type LifeAccordionMeta = {
  title: string
  subtitle: string
  configured: boolean
}

function homeIsConfigured(h: LifePlansHousing): boolean {
  return (
    h.ownership !== 'own' ||
    h.mortgageBalance > 0 ||
    h.saleProceeds > 0 ||
    h.planToSell === 'Yes'
  )
}

function familyIsConfigured(f: LifePlansFamily): boolean {
  return f.married || f.hasChildren || f.supportingParent
}

function incomeIsConfigured(o: LifePlansOther, v: LifePlansVehicles): boolean {
  return o.hasRental || o.expectsInheritance !== 'No' || v.count > 0 || o.tithes
}

export function lifeAccordionMeta(plans: LifePlans): {
  home: LifeAccordionMeta
  family: LifeAccordionMeta
  income: LifeAccordionMeta
} {
  return {
    home: {
      title: 'Your home',
      subtitle: homeAccordionSubtitle(plans.housing),
      configured: homeIsConfigured(plans.housing),
    },
    family: {
      title: 'Your family',
      subtitle: familyAccordionSubtitle(plans.family),
      configured: familyIsConfigured(plans.family),
    },
    income: {
      title: 'Income & assets',
      subtitle: incomeAccordionSubtitle(plans.other, plans.vehicles),
      configured: incomeIsConfigured(plans.other, plans.vehicles),
    },
  }
}
