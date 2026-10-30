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
let snapshotKey: string | null = null;
const listeners = new Set<() => void>();

function parseIdentity(raw: string | null): PortalIdentity | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PortalIdentity;
  } catch {
    return null;
  }
}

/**
 * Reads through to localStorage and caches the result. The cache keeps the
 * snapshot referentially stable (a useSyncExternalStore requirement) and is
 * keyed on the raw values, so a page reload - which starts from a fresh module
 * holding ANONYMOUS - picks the stored session up on the first client render
 * instead of staying signed out until the next save/clear.
 */
function readSession(): SessionState {
  if (typeof window === "undefined") {
    return ANONYMOUS;
  }
  const accessToken = window.localStorage.getItem(ACCESS_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);
  const key = `${accessToken ?? ""}\u0000${rawUser ?? ""}`;
  if (key === snapshotKey) {
    return snapshot;
  }
  snapshotKey = key;
  snapshot = accessToken
    ? { status: "authenticated", user: parseIdentity(rawUser) }
    : ANONYMOUS;
  return snapshot;
}

function emit(): void {
  // Refresh the cache before notifying so listeners that read the snapshot
  // synchronously observe the new state.
  readSession();
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
  return readSession();
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
