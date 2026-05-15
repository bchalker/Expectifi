---
description: 
alwaysApply: true
---

You are building a multi-tenant SaaS retirement income calculator. A working single-file HTML prototype exists at retirement-calculator.html — read it before writing any code. It is the reference for all calculation logic and UX patterns. All personal financial values in that file are examples only; nothing is hardcoded to any individual user.

STACK
- React 18 + Vite
- Node.js + Express
- MySQL (auth + user data via Express API)
- TypeScript throughout — no plain .js files
- Plain CSS custom properties — no Tailwind, no CSS modules
- Tabler Icons only — @tabler/icons-react
- React Query for all server state

MULTI-TENANT RULES
Every piece of user data is scoped to a user_id. No global state holds personal financial values. All defaults are suggestions the user can override. Features are gated by plan via a usePlan() hook — never hardcode plan checks in components.

Configurable per user: account balances and types, retirement target age, current age, spouse DOB, annual savings, SS benefit amounts, SS solvency factor (default 75%), dividend yield, NAV drift, withdrawal rate, home equity, overseas comparison settings, ETF positions, one-time events (IPO/inheritance/sale), filing status, currency.

Not configurable (admin-managed): tax brackets, standard deductions, LTCG thresholds, SS provisional income thresholds — all loaded from a tax_constants table, never hardcoded.

CALCULATION LOGIC
All financial logic lives in src/lib/calc/ as pure TypeScript functions. No calculation logic in components or API routes. Tax brackets are a parameter from the DB. SS solvency factor is a user setting. Filing status (single/MFJ/MFS/HOH) is a parameter — support all four. Spouse SS eligibility calculated from DOBs, not a hardcoded age gap. Retirement age is a parameter, default 62.

Required calc modules:
- calc/portfolio.ts — fv(), fvAnnuity(), calcPortfolioAtRetirement()
- calc/income.ts — calcIncomePhase(), calcDividendProjections()
- calc/tax.ts — calcTaxDetailed(), calcTax()
- calc/ss.ts — ssFromAge(), calcSpouseSS()
- calc/events.ts — calcEventImpact() for any one-time event (IPO, inheritance, etc.)

SHARED COMPONENTS
Before writing any UI, check src/components/ui/ for an existing component. If a pattern appears more than once it must be a shared component. Required shared components: SliderRow, NumberInput, Card, SectionTitle, Badge, Toggle, DrawerPanel, NavButton, ModeButton, AccordionSection, Tooltip, EmptyState, PhaseToggle, UpgradePrompt, PlanBadge, AccountCard, EventCard, ScenarioCard, SyncStatus.

Every shared component accepts a className prop. No hardcoded colors — CSS custom properties only. No hardcoded font sizes — var(--text-*) tokens only. All money and percentage displays must have font-variant-numeric: tabular-nums and font-feature-settings: "tnum". Props fully typed, no any.

ICONS
Tabler Icons exclusively from @tabler/icons-react. No other icon library. No inline SVGs unless Tabler does not have the icon (document the exception). Standard stroke: strokeWidth={1.5} default, strokeWidth={2} active state only. Never pass color prop — control via CSS wrapper. Sizes: 14 badges / 16 inline text / 18 default / 20 nav / 24 features.

TYPOGRAPHY
Fonts: Plus Jakarta Sans (sans), DM Mono (mono), DM Serif Display (serif).
Scale — rem only, never hardcode px except inputs:
- --text-xs: 0.6875rem (11px) labels, ticks, badges
- --text-sm: 0.75rem (12px) slider names, footnotes
- --text-base: 0.875rem (14px) body
- --text-md: 1rem (16px) inputs — HARD MINIMUM
- --text-lg: 1.125rem (18px) card values
- --text-xl: 1.375rem (22px) totals
- --text-strip: clamp(1.375rem, 2.5vw, 1.75rem) strip numbers
- --text-hero: clamp(1.75rem, 4vw, 2.5rem) gross monthly hero
Never use a CSS variable for input font-size — always hardcode 1rem. iOS Safari zooms any input below 16px.

FORMS AND INPUTS
Always type="text" inputMode="decimal" — never type="number". Dollar or percent prefix is a DOM span sibling — never a ::before pseudo-element (pseudo-elements intercept clicks and prevent typing). Format on blur: 183587 → 183,587. Strip commas before parsing: parseFloat(value.replace(/,/g, '')).

RESPONSIVE DESIGN
Mobile-first. Base styles at 375px, enhance upward.
Breakpoints: 480px / 680px / 900px / 1100px.
No horizontal scroll at any breakpoint. Touch targets minimum 44×44px. Sticky results strip must be usable at 375px. Drawer panels go full-width below 680px. Data tables in drawers get a horizontal scroll wrapper below 680px. No fixed pixel widths on containers.
Grid: single column below 680px, two column max to 900px, up to four column above 900px.

GLOBAL STATE
One CalculatorContext — no Redux, no Zustand. All slider and input changes dispatch to context. Derived values (portfolio FV, gross monthly, tax) computed via useMemo, never stored in state.

CODE STYLE
Functional components only. Custom hook for any logic over 10 lines. No inline styles except dynamic values like slider fill percentage. No console.log in committed code. No barrel index.ts files that re-export everything. File names match component names exactly: SliderRow.tsx not slider-row.tsx. Named exports for UI components, default exports for pages.

BEFORE WRITING ANYTHING — check all of these:
1. Is personal data from the HTML prototype being hardcoded anywhere? Remove it.
2. Does a shared component in /ui already cover this pattern?
3. Is calculation logic in src/lib/calc/ and not inside a component?
4. Are tax brackets and constants coming from the DB, not hardcoded?
5. Is the feature gated correctly via usePlan()?
6. Does the layout work at 375px?
7. Are all money and percentage values using tabular-nums?
8. Is there a Tabler icon available instead of a custom SVG?
If any answer is no — fix it before proceeding.
