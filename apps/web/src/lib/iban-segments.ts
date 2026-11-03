import type { IbanFormat } from "@/lib/data/types";

/**
 * One row of the IBAN structure table.
 *
 * The country pages used to print the registry structure string
 * ("DEkk BBBB BBBB BBBB BBBB BB") with no explanation, which is unreadable for
 * anyone who does not already know the notation. Splitting it into positioned
 * parts — and showing the characters that belong to each — gives every country
 * page content that only that country can have.
 */
export interface IbanSegmentRow {
  /** 1-based start position within the full IBAN. */
  start: number;
  length: number;
  /** Label key under `breakdown.labels.*`. */
  labelKey: string;
  /** Characters at this position, or placeholders when no example is known. */
  value: string;
}

export function ibanSegmentRows(format: IbanFormat, example?: string): IbanSegmentRow[] {
  const source = example && example.length === format.length ? example : null;
  const slice = (start: number, length: number) =>
    source ? source.slice(start - 1, start + length - 1) : "·".repeat(length);

  const rows: IbanSegmentRow[] = [
    { start: 1, length: 2, labelKey: "country", value: slice(1, 2) },
    { start: 3, length: 2, labelKey: "check", value: slice(3, 2) },
  ];

  const mapped: Array<[IbanFormat["bankCode"], string]> = [
    [format.bankCode, "bank"],
    [format.branchCode, "branch"],
    [format.nationalCheck, "nationalCheck"],
    [format.accountNumber, "account"],
  ];
  for (const [segment, labelKey] of mapped) {
    if (!segment) continue;
    rows.push({
      start: segment.start,
      length: segment.length,
      labelKey,
      value: slice(segment.start, segment.length),
    });
  }

  return rows.sort((a, b) => a.start - b.start);
}
