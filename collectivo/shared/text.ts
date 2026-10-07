/** Rejects input that consists only of whitespace. Empty values pass. */
export function isNotBlank(value?: string | null): boolean {
  return !value || value.trim().length > 0;
}
