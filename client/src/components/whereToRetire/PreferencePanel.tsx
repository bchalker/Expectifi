import { useState } from 'react'
import { SidePanelShell } from '../SidePanelShell'
import {
  loadPreferences,
  savePreferences,
  type WtrPreferences,
} from '../../lib/whereToRetire/preferences'
import { PreferenceQuestions } from './PreferenceQuestions'
import './PreferenceQuestions.scss'
import './PreferencePanel.scss'

type Props = {
  open: boolean
  onClose: () => void
  onSave: (prefs: WtrPreferences) => void
}

export function PreferencePanel({ open, onClose, onSave }: Props) {
  const existing = loadPreferences()
  const [draft, setDraft] = useState(() => ({
    regionScope: existing?.regionScope ?? 'both',
    priorities: existing?.priorities ?? [],
    dealbreakers: existing?.dealbreakers ?? [],
  }))

  const handleSave = () => {
    const prefs: WtrPreferences = {
      completed: true,
      skipped: false,
      regionScope: draft.regionScope,
      priorities: draft.priorities,
      dealbreakers: draft.dealbreakers.filter((d) => d !== 'none'),
    }
    savePreferences(prefs)
    onSave(prefs)
    onClose()
  }

  return (
    <SidePanelShell
      open={open}
      titleId="wtr-pref-panel-title"
      title="Retirement preferences"
      onClose={onClose}
      closeAriaLabel="Close preferences"
      shellClassName="drawer-shell--right wtr-pref-panel"
      bodyClassName="wtr-pref-panel__body"
      footer={
        <div className="wtr-pref-panel__footer">
          <button type="button" className="wtr-pref-panel__save" onClick={handleSave}>
            Save & update recommendations
          </button>
        </div>
      }
    >
      <p className="wtr-pref-panel__lead">
        Adjust what matters most. Your manually added destinations stay in the grid; auto recommendations
        refresh.
      </p>
      <PreferenceQuestions draft={draft} onChange={setDraft} step={1} />
      <PreferenceQuestions draft={draft} onChange={setDraft} step={2} />
      <PreferenceQuestions draft={draft} onChange={setDraft} step={3} />
    </SidePanelShell>
  )
}
