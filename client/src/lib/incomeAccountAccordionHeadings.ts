/** Display labels for income account row section headings (spell out acronyms). */
const SECTION_HEADING_LABELS: Record<string, string> = {
  RMDs: 'Required Minimum Distributions',
}

export function formatIncomeSectionHeading(heading: string): string {
  return SECTION_HEADING_LABELS[heading] ?? heading
}
