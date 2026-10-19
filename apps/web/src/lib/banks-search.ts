/**
 * Pure matching/scoring helpers for the bank directory search. Kept free of
 * React and data-source specifics so the directory page can reuse it over any
 * row list (static dataset now, build-time snapshots later) and unit-test it
 * in isolation.
 *
 * Scoring follows the directory design (方案 §3.2): short-name and full-name
 * word-prefix hits rank above substring hits; identifier/code prefix hits
 * (e.g. typing "CHAS" or "062") rank on top.
 */

export interface BankSearchDoc {
  slug: string;
  nameEn: string;
  shortName: string;
  legalName?: string;
  nameLocal?: string;
  countryName: string;
  countryIso2: string;
  /** Formatted primary code (SWIFT etc.); matched as a prefix when typing codes. */
  primaryIdentifier?: string;
}

/** Lowercase + strip accents/punctuation, but keep CJK for local names. */
export function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .trim();
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, "");
}

/**
 * 0 = no match, ≤1 = confidence within a field. Every query token must be
 * found for a positive score; word-prefix hits outrank substring hits.
 */
function fieldScore(text: string, tokens: string[]): number {
  if (text.length === 0 || tokens.length === 0) return 0;
  const words = text.split(" ").filter(Boolean);
  let prefix = true;
  let substring = true;
  for (const token of tokens) {
    const asWordPrefix = words.some((word) => word.startsWith(token));
    if (asWordPrefix) continue;
    prefix = false;
    if (!text.includes(token)) {
      substring = false;
      break;
    }
  }
  if (prefix) {
    return words.join(" ") === tokens.join(" ") ? 1 : 0.85;
  }
  return substring ? 0.6 : 0;
}

/** Weighted best-of-fields score; null when the doc does not match at all. */
export function scoreBank(doc: BankSearchDoc, rawQuery: string): number | null {
  const query = rawQuery.trim();
  if (!query) return null;
  const tokens = normalizeQuery(query).split(" ").filter(Boolean);

  const fields: Array<[string, number]> = [
    [normalizeQuery(doc.shortName), 30],
    [normalizeQuery(doc.nameEn), 20],
    [normalizeQuery(doc.legalName ?? ""), 12],
    [normalizeQuery(doc.nameLocal ?? ""), 12],
    [normalizeQuery(doc.countryName), 5],
  ];

  let best = 0;
  for (const [text, weight] of fields) {
    const score = fieldScore(text, tokens);
    if (score * weight > best) best = score * weight;
  }

  // Identifier prefix: typing "CHAS" or "062000" should surface the bank.
  const code = compact(query);
  if (code.length >= 3 && doc.primaryIdentifier) {
    if (compact(doc.primaryIdentifier).startsWith(code)) {
      best = Math.max(best, 90);
    }
  }

  return best > 0 ? best : null;
}

export interface ScoredBank<T> {
  doc: T;
  score: number;
}

/** Filter + rank; empty query returns null so callers keep the default order. */
export function searchBanks<T extends BankSearchDoc>(
  docs: T[],
  rawQuery: string,
  countryIso2?: string,
): Array<ScoredBank<T>> | null {
  const query = rawQuery.trim();
  const scoped = countryIso2
    ? docs.filter((doc) => doc.countryIso2 === countryIso2)
    : docs;
  if (!query) return null;
  const scored: Array<ScoredBank<T>> = [];
  for (const doc of scoped) {
    const score = scoreBank(doc, query);
    if (score !== null) scored.push({ doc, score });
  }
  scored.sort(
    (a, b) => b.score - a.score || a.doc.nameEn.localeCompare(b.doc.nameEn),
  );
  return scored;
}

/**
 * Split `text` into plain segments and highlighted matches of the query
 * (case-insensitive, longest token first). Returns null when nothing to
 * highlight so callers can render the plain string.
 */
export function matchSegments(
  text: string,
  rawQuery: string,
): Array<{ text: string; highlight: boolean }> | null {
  const query = rawQuery.trim();
  if (!query || !text) return null;
  const token = normalizeQuery(query)
    .split(" ")
    .filter((part) => part.length >= 2)
    .sort((a, b) => b.length - a.length)[0];
  if (!token) return null;

  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(token);
  if (index === -1) return null;
  return [
    { text: text.slice(0, index), highlight: false },
    { text: text.slice(index, index + token.length), highlight: true },
    { text: text.slice(index + token.length), highlight: false },
  ].filter((segment) => segment.text.length > 0);
}
