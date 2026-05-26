import { useContext } from 'react'
import { UserTierContext, type UserTierContextValue } from '../context/UserTierContext'

export function useUserTier(): UserTierContextValue {
  const ctx = useContext(UserTierContext)
  if (!ctx) {
    throw new Error('useUserTier must be used within UserTierProvider')
  }
  return ctx
}
