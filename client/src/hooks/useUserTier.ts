import { useContext } from 'react'
import { UserTierContext } from '../context/UserTierContext'

export function useUserTier() {
  const ctx = useContext(UserTierContext)
  if (!ctx) {
    throw new Error('useUserTier must be used within UserTierProvider')
  }
  return ctx
}
