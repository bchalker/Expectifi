#!/usr/bin/env node
/**
 * One-time codemod: replace hardcoded padding/margin/gap values with --space-* tokens.
 * Run from repo root: node scripts/refactor-spacing-to-tokens.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const CLIENT_SRC = path.join(ROOT, 'client/src')

const SPACING_PROPS =
  /^(padding|margin|gap|row-gap|column-gap)(-(top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?\s*:/

const SKIP_FILES = new Set([
  path.join(CLIENT_SRC, 'styles/tokens.css'),
])

/** px value → token name */
const STEPS = [
  [0, '0'],
  [4, 'var(--space-1)'],
  [8, 'var(--space-2)'],
  [12, 'var(--space-3)'],
  [16, 'var(--space-4)'],
  [24, 'var(--space-5)'],
  [32, 'var(--space-6)'],
  [40, 'var(--space-7)'],
  [48, 'var(--space-8)'],
  [64, 'var(--space-9)'],
  [80, 'var(--space-10)'],
  [96, 'var(--space-11)'],
]

function toPx(token) {
  const t = token.trim()
  if (t === '0') return 0
  const px = t.match(/^(-?[\d.]+)px$/)
  if (px) return Number(px[1])
  const rem = t.match(/^(-?[\d.]+)rem$/)
  if (rem) return Number(rem[1]) * 16
  return null
}

function nearestToken(px) {
  if (px === 0) return { value: '0', review: false }
  let best = STEPS[1]
  let bestDist = Math.abs(px - best[0])
  for (const step of STEPS.slice(1)) {
    const d = Math.abs(px - step[0])
    if (d < bestDist) {
      best = step
      bestDist = d
    }
  }
  return { value: best[1], review: bestDist > 0 }
}

function convertTokenPart(part, original) {
  const trimmed = part.trim()
  if (
    !trimmed ||
    trimmed === 'auto' ||
    trimmed === 'inherit' ||
    trimmed === 'initial' ||
    trimmed === 'unset' ||
    trimmed.startsWith('var(') ||
    trimmed.startsWith('calc(') ||
    trimmed.startsWith('clamp(') ||
    trimmed.startsWith('max(') ||
    trimmed.startsWith('min(') ||
    trimmed.includes('%') ||
    trimmed.includes('env(')
  ) {
    return part
  }
  const px = toPx(trimmed)
  if (px === null) return part
  const { value, review } = nearestToken(px)
  if (!review && (trimmed === value || (trimmed === '0' && value === '0'))) {
    return part
  }
  if (review) {
    return `${value} /* review: was ${original.trim()} */`
  }
  return value
}

function convertValueList(valuePart) {
  const original = valuePart
  const parts = valuePart.split(/(\s+)/)
  let out = ''
  let buf = ''
  for (const chunk of parts) {
    if (/^\s+$/.test(chunk)) {
      if (buf) {
        out += convertTokenPart(buf, buf)
        buf = ''
      }
      out += chunk
    } else if (chunk.includes(',')) {
      const subs = chunk.split(',')
      out += subs
        .map((s, i) => {
          const converted = convertTokenPart(s, s)
          return i < subs.length - 1 ? converted + ',' : converted
        })
        .join('')
    } else {
      buf += chunk
    }
  }
  if (buf) out += convertTokenPart(buf, buf)
  return out || original
}

function processLine(line) {
  if (line.trim().startsWith('//') || line.trim().startsWith('/*')) return line
  if (line.includes('font-size') || line.includes('line-height') || line.includes('border-radius')) {
    return line
  }
  const propMatch = line.match(/^(\s*)([\w-]+)\s*:\s*(.+?)(\s*!important)?\s*;\s*$/)
  if (!propMatch) return line
  const [, indent, prop, value, important = ''] = propMatch
  if (!SPACING_PROPS.test(`${prop}:`)) return line
  const converted = convertValueList(value)
  if (converted === value) return line
  return `${indent}${prop}: ${converted}${important};`
}

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue
      walk(p, files)
    } else if (ent.name.endsWith('.scss')) {
      files.push(p)
    }
  }
  return files
}

let changedFiles = 0
let changedLines = 0

for (const file of walk(CLIENT_SRC)) {
  if (SKIP_FILES.has(file)) continue
  const src = fs.readFileSync(file, 'utf8')
  const lines = src.split('\n')
  let fileChanged = false
  const next = lines.map((line) => {
    const n = processLine(line)
    if (n !== line) {
      fileChanged = true
      changedLines++
    }
    return n
  })
  if (fileChanged) {
    fs.writeFileSync(file, next.join('\n'))
    changedFiles++
  }
}

console.log(`Updated ${changedFiles} files, ${changedLines} lines`)
