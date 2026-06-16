import { EXPECTIFI_TAX_SUMMARY_PANEL_OPEN_KEY } from './planStorage/keys'
import { canWritePlanLocalStorage } from './planStorage/writeContext'

export function loadTaxSummaryPanelOpen(): boolean {
  try {
    const raw = localStorage.getItem(EXPECTIFI_TAX_SUMMARY_PANEL_OPEN_KEY)
    if (raw === 'false') return false
    if (raw === 'true') return true
  } catch {
    /* ignore */
  }
  return false
}

export function saveTaxSummaryPanelOpen(open: boolean): void {
  if (!canWritePlanLocalStorage()) return
  try {
    localStorage.setItem(EXPECTIFI_TAX_SUMMARY_PANEL_OPEN_KEY, String(open))
  } catch {
    /* ignore */
  }
}
