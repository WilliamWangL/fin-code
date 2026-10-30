import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * First value with non-blank content, trimmed. Empty strings, null and
 * undefined all count as missing: the directory export uses "" and null
 * interchangeably for absent columns, so `??` chains silently stop at "".
 */
export function firstNonBlank(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return "";
}
