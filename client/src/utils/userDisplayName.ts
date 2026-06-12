export function firstNameFromDisplayName(
  displayName: string | null | undefined,
): string {
  if (!displayName?.trim()) return '';
  return displayName.trim().split(/\s+/)[0] ?? '';
}
