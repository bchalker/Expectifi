import { useEffect, useRef, useState } from 'react'
import { Button, Card } from '@heroui/react'
import { IconCheck, IconPencil, IconPlus, IconX } from '@tabler/icons-react'
import type { CalculatorInputs, CalculatorUi } from '../lib/computeResults'

function clampPreset(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function parseSignedNum(raw: string): number {
  const v = parseFloat(String(raw ?? '').replace(/,/g, '').trim())
  return Number.isFinite(v) ? v : 0
}

function newIncomePresetId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `p-${Date.now().toString(36)}`
}

type Props = {
  ui: CalculatorUi
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  activePreset: string | null
  setActivePreset: (p: string | null) => void
  /** When true, always show the editor (e.g. in Configure panel); otherwise mirror Income phase strip mode */
  alwaysShow?: boolean
}

export function IncomePresetScenariosCard({
  ui,
  inputs,
  setInputs,
  activePreset,
  setActivePreset,
  alwaysShow = false,
}: Props) {
  const [draftLabel, setDraftLabel] = useState('')
  const [draftYield, setDraftYield] = useState('6')
  const [draftNav, setDraftNav] = useState('1')
  const [presetsEditMode, setPresetsEditMode] = useState(false)
  const lastPresetFocusSeq = useRef(0)

  useEffect(() => {
    const seq = ui.incomePresetEditorFocusSeq ?? 0
    if (seq > lastPresetFocusSeq.current) {
      lastPresetFocusSeq.current = seq
      setPresetsEditMode(true)
      requestAnimationFrame(() => {
        document.getElementById('income-preset-scenarios')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [ui.incomePresetEditorFocusSeq])

  useEffect(() => {
    if (!ui.incomeMode && !alwaysShow) setPresetsEditMode(false)
  }, [ui.incomeMode, alwaysShow])

  const presets = inputs.incomePresets

  function addIncomePreset() {
    const label = draftLabel.trim()
    if (!label) return
    const y = clampPreset(parseSignedNum(draftYield) || 6, 2, 20)
    const g = clampPreset(parseSignedNum(draftNav), -10, 10)
    const id = newIncomePresetId()
    const next = [...presets, { id, label, y, g }]
    setInputs({ incomePresets: next, incYield: y / 100, incGrowth: g / 100 })
    setActivePreset(id)
    setDraftLabel('')
    setDraftYield('6')
    setDraftNav('1')
  }

  function removeIncomePreset(id: string) {
    if (presets.length <= 1) return
    const next = presets.filter((p) => p.id !== id)
    if (activePreset === id) {
      const first = next[0]
      setActivePreset(first?.id ?? null)
      if (first) setInputs({ incomePresets: next, incYield: first.y / 100, incGrowth: first.g / 100 })
      else setInputs({ incomePresets: next })
    } else {
      setInputs({ incomePresets: next })
    }
  }

  const showCard = alwaysShow || ui.incomeMode

  if (!showCard) {
    return (
      <p className="footnote footnote--muted" style={{ margin: 0, border: 'none', padding: 0 }}>
        Presets apply when the strip is in <strong>Income · Dividend</strong>. Open Configure (gear) any time to edit scenarios.
      </p>
    )
  }

  return (
    <Card id="income-preset-scenarios" className="inc-preset-card">
      <div className="inc-preset-card-head">
        <span className="inc-preset-card-title">Preset scenarios</span>
        <Button
          type="button"
          size="sm"
          variant={presetsEditMode ? 'primary' : 'outline'}
          className="font-[family-name:var(--body)] text-[10px] uppercase tracking-[0.06em]"
          aria-pressed={presetsEditMode}
          onPress={() => setPresetsEditMode((v) => !v)}
        >
          {presetsEditMode ? (
            <>
              <IconCheck size={15} stroke={2} aria-hidden />
              <span>Done</span>
            </>
          ) : (
            <>
              <IconPencil size={15} stroke={2} aria-hidden />
              <span>Edit</span>
            </>
          )}
        </Button>
      </div>
      {!presetsEditMode ? (
        <p className="footnote footnote--muted" style={{ margin: 0, border: 'none', padding: '4px 0 0' }}>
          Choose the active scenario from the strip under <strong>Income · Dividend</strong>, or tap <strong>Edit</strong> here to add or remove presets.
        </p>
      ) : (
        <>
          <ul className="inc-preset-edit-list" aria-label="Preset scenarios">
            {presets.map((p) => (
              <li key={p.id} className="inc-preset-edit-item">
                <span className="inc-preset-edit-text">
                  <span className="inc-preset-edit-label">{p.label}</span>
                  <span className="inc-preset-edit-meta">
                    {p.y}% / {p.g >= 0 ? '+' : ''}
                    {p.g}%
                  </span>
                </span>
                {presets.length > 1 ? (
                  <Button
                    type="button"
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="inc-preset-del"
                    aria-label={`Remove ${p.label}`}
                    onPress={() => removeIncomePreset(p.id)}
                  >
                    <IconX size={16} stroke={1.75} aria-hidden />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="inc-preset-add inc-preset-add--in-card">
            <label className="inc-preset-add-field">
              <span className="inc-preset-add-label">New label</span>
              <input
                type="text"
                className="num-input"
                style={{ width: '100%', minWidth: 0 }}
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="e.g. SCHD · 4% / +2%"
              />
            </label>
            <label className="inc-preset-add-field">
              <span className="inc-preset-add-label">Yield %</span>
              <input
                type="text"
                className="num-input"
                style={{ width: 52 }}
                value={draftYield}
                onChange={(e) => setDraftYield(e.target.value)}
              />
            </label>
            <label className="inc-preset-add-field">
              <span className="inc-preset-add-label">NAV %</span>
              <input
                type="text"
                className="num-input"
                style={{ width: 52 }}
                value={draftNav}
                onChange={(e) => setDraftNav(e.target.value)}
                placeholder="±"
              />
            </label>
            <Button
              type="button"
              isIconOnly
              size="md"
              variant="outline"
              className="inc-preset-plus-btn !rounded-full"
              aria-label="Add preset"
              onPress={() => addIncomePreset()}
            >
              <IconPlus size={18} stroke={2} aria-hidden />
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
