"use client";

import { useSyncExternalStore } from "react";

import type { AuthTokens } from "@/lib/portal/types";

/**
 * Browser session store for the developer portal (FIN-017). Access and refresh
 * tokens live in localStorage because the API authenticates with the
 * Authorization header (no cross-origin cookies); the header and dashboard
 * subscribe via useSession().
 */

const ACCESS_KEY = "fincode.portal.access_token";
const REFRESH_KEY = "fincode.portal.refresh_token";
const USER_KEY = "fincode.portal.user";

export interface PortalIdentity {
  email: string;
  name: string | null;
}

export interface SessionState {
  status: "anonymous" | "authenticated";
  user: PortalIdentity | null;
}

const ANONYMOUS: SessionState = { status: "anonymous", user: null };

let snapshot: SessionState = ANONYMOUS;
const listeners = new Set<() => void>();

function readIdentity(): PortalIdentity | null {
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PortalIdentity;
  } catch {
    return null;
  }
}

function readSession(): SessionState {
  const accessToken = window.localStorage.getItem(ACCESS_KEY);
  if (!accessToken) {
    return ANONYMOUS;
  }
  return { status: "authenticated", user: readIdentity() };
}

function emit(): void {
  snapshot = typeof window === "undefined" ? ANONYMOUS : readSession();
  listeners.forEach((listener) => listener());
}

function handleStorage(event: StorageEvent): void {
  if (event.key === null || event.key.startsWith("fincode.portal.")) {
    emit();
  }
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

function getSnapshot(): SessionState {
  return snapshot;
}

function getServerSnapshot(): SessionState {
  return ANONYMOUS;
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(REFRESH_KEY);
}

export function saveSession(tokens: AuthTokens, user?: PortalIdentity | null): void {
  window.localStorage.setItem(ACCESS_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  emit();
}

export function clearSession(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
  emit();
}
