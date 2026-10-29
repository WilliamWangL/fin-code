"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Anonymous lookups the website allows per visitor per UTC day. The API
 * enforces the same cap per client IP; this browser-side counter keeps the
 * limit visible (and stops an extra request) when a visitor reloads the page
 * or switches identifier pages.
 */
export const DAILY_LOOKUP_LIMIT = 5;

const STORAGE_KEY = "fincode.lookups.daily";
const SERVER_REMAINING_HEADER = "x-daily-lookup-remaining";

interface Usage {
  /** UTC day, matching the API quota window. */
  day: string;
  used: number;
}

function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Reading storage never throws: private mode simply reports a fresh day. */
function readUsage(): Usage {
  const today = utcDay();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { day: today, used: 0 };
    const parsed = JSON.parse(raw) as Partial<Usage>;
    if (parsed.day !== today || typeof parsed.used !== "number") {
      return { day: today, used: 0 };
    }
    return { day: today, used: Math.max(0, Math.trunc(parsed.used)) };
  } catch {
    return { day: today, used: 0 };
  }
}

function writeUsage(usage: Usage): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // Storage blocked: the API still enforces the cap for this IP.
  }
}

export interface LookupQuota {
  /** Lookups left, the stricter of the browser count and the API header. */
  remaining: number;
  limit: number;
  /** True once either side reports the allowance as spent. */
  exhausted: boolean;
  /** Counts one attempt in this browser before the request is sent. */
  record: () => void;
  /** Adopts the API's remaining count from the lookup response. */
  sync: (response: Response) => void;
}

/**
 * Daily allowance shared by every lookup box on the site: one counter in
 * localStorage plus the API's X-Daily-Lookup-Remaining header, whichever is
 * stricter wins. Nothing is read during SSR, so the first paint stays
 * deterministic.
 */
export function useLookupQuota(): LookupQuota {
  const [used, setUsed] = useState(0);
  const [ready, setReady] = useState(false);
  const [serverRemaining, setServerRemaining] = useState<number | null>(null);

  useEffect(() => {
    setUsed(readUsage().used);
    setReady(true);
  }, []);

  const record = useCallback(() => {
    const usage = readUsage();
    const next = { day: usage.day, used: usage.used + 1 };
    writeUsage(next);
    setUsed(next.used);
  }, []);

  const sync = useCallback((response: Response) => {
    const header = response.headers.get(SERVER_REMAINING_HEADER);
    if (header === null) return;
    const value = Number.parseInt(header, 10);
    if (Number.isFinite(value)) {
      setServerRemaining(Math.max(0, value));
    }
  }, []);

  const localRemaining = Math.max(0, DAILY_LOOKUP_LIMIT - used);
  const remaining =
    serverRemaining === null ? localRemaining : Math.min(localRemaining, serverRemaining);

  return {
    remaining,
    limit: DAILY_LOOKUP_LIMIT,
    exhausted: ready && remaining <= 0,
    record,
    sync,
  };
}
