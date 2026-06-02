#!/usr/bin/env node
/** Report spacing declarations that still use raw px/rem (excluding review comments and non-spacing). */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..', 'client/src')
const SPACING = /^(padding|margin|gap|row-gap|column-gap)(-[a-z-]+)?\s*:/

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue
      walk(p, files)
    } else if (/\.(scss|tsx|ts|css)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
      files.push(p)
    }
  }
  return files
}

const hits = []
for (const file of walk(ROOT)) {
  if (file.endsWith('tokens.css')) continue
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (!SPACING.test(line.trim())) return
    if (line.includes('var(--space')) return
    if (/font-size|line-height|border-radius/.test(line)) return
    if (/\d+(px|rem|em)\b/.test(line)) hits.push({ file: path.relative(ROOT, file), line: i + 1, text: line.trim() })
  })
}

console.log(`Remaining spacing lines without var(--space-*): ${hits.length}`)
hits.slice(0, 40).forEach((h) => console.log(`${h.file}:${h.line} ${h.text}`))
if (hits.length > 40) console.log(`... and ${hits.length - 40} more`)
