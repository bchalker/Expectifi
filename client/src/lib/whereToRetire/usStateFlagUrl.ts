/** US state flag images (Flagpedia / flagcdn.com). */
export function usStateFlagUrl(stateCode: string, height = 40): string {
  return `https://flagcdn.com/h${height}/us-${stateCode.toLowerCase()}.png`
}
