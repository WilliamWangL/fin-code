/**
 * Human input often carries separators the API does not expect: spaces in
 * grouped IBANs, hyphens in UK sort codes and Australian BSBs. Strip them
 * before the value reaches the URL path.
 */
export function normalizeIdentifier(input: string): string {
  return input.trim().replace(/[\s-]/g, "").toUpperCase();
}
