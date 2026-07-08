import { useCallback, useMemo, type KeyboardEvent } from 'react'
import {
  DEV_FONT_HEADING_CATEGORIES,
  DEV_FONT_SANS_CATEGORIES,
  type GoogleFontCategory,
  type GoogleFontEntry,
} from './devFontCatalog'
import { useDevFontPreview } from './useDevFontPreview'
import './DevFontPreviewPicker.scss'

const CATEGORY_LABELS: Record<GoogleFontCategory, string> = {
  'Sans Serif': 'Sans Serif',
  Serif: 'Serif',
  Display: 'Display',
  Handwriting: 'Handwriting / Calligraphy',
  Monospace: 'Monospace',
}

function groupFontsByCategory(
  fonts: GoogleFontEntry[],
  categories: readonly GoogleFontCategory[],
): Array<{ category: GoogleFontCategory; fonts: GoogleFontEntry[] }> {
  return categories.map((category) => ({
    category,
    fonts: fonts.filter((font) => font.category === category),
  }))
}

function flattenFontFamilies(
  groups: Array<{ category: GoogleFontCategory; fonts: GoogleFontEntry[] }>,
): string[] {
  return groups.flatMap(({ fonts }) => fonts.map((font) => font.family))
}

type DevFontSelectProps = {
  id: string
  label: string
  value: string
  disabled?: boolean
  groups: Array<{ category: GoogleFontCategory; fonts: GoogleFontEntry[] }>
  onChange: (family: string) => void
}

function DevFontSelect({ id, label, value, disabled = false, groups, onChange }: DevFontSelectProps) {
  const families = useMemo(() => flattenFontFamilies(groups), [groups])

  const moveSelection = useCallback(
    (direction: -1 | 1) => {
      if (families.length === 0) return
      const currentIndex = families.indexOf(value)
      const startIndex = currentIndex >= 0 ? currentIndex : 0
      const nextIndex = (startIndex + direction + families.length) % families.length
      onChange(families[nextIndex]!)
    },
    [families, onChange, value],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLSelectElement>) => {
      if (disabled || families.length === 0) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveSelection(1)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveSelection(-1)
      }
    },
    [disabled, families.length, moveSelection],
  )

  return (
    <label className="dev-font-preview__field" htmlFor={id}>
      <span className="dev-font-preview__label">{label}</span>
      <select
        id={id}
        className="dev-font-preview__select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      >
        {groups.map(({ category, fonts }) => (
          <optgroup key={category} label={CATEGORY_LABELS[category]}>
            {fonts.map((font) => (
              <option key={font.family} value={font.family}>
                {font.family}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

/** Local-only font preview controls for --font-heading and --font-sans. */
export function DevFontPreviewPicker() {
  const {
    loading,
    error,
    headingFonts,
    sansFonts,
    headingFamily,
    sansFamily,
    setHeadingFamily,
    setSansFamily,
  } = useDevFontPreview()

  const headingGroups = useMemo(
    () => groupFontsByCategory(headingFonts, DEV_FONT_HEADING_CATEGORIES),
    [headingFonts],
  )
  const sansGroups = useMemo(
    () => groupFontsByCategory(sansFonts, DEV_FONT_SANS_CATEGORIES),
    [sansFonts],
  )

  return (
    <div className="dev-font-preview" aria-label="Dev font preview" data-dev-only>
      <span className="dev-font-preview__badge">DEV</span>
      <DevFontSelect
        id="dev-font-heading"
        label="Heading"
        value={headingFamily}
        disabled={loading || Boolean(error)}
        groups={headingGroups}
        onChange={setHeadingFamily}
      />
      <DevFontSelect
        id="dev-font-sans"
        label="Body"
        value={sansFamily}
        disabled={loading || Boolean(error)}
        groups={sansGroups}
        onChange={setSansFamily}
      />
      {error ? <span className="dev-font-preview__error">{error}</span> : null}
    </div>
  )
}
