import { useCallback, useEffect, useState } from "react";
import type { SmtpAccount, ContactList, Campaign } from "./types";

const KEYS = {
  smtps: "mailpilot.smtps",
  lists: "mailpilot.lists",
  campaigns: "mailpilot.campaigns",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(`store:${key}`));
}

function useStore<T>(key: string, fallback: T) {
  const [state, setState] = useState<T>(fallback);

  useEffect(() => {
    setState(read<T>(key, fallback));
    const handler = () => setState(read<T>(key, fallback));
    window.addEventListener(`store:${key}`, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(`store:${key}`, handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
        write(key, next);
        return next;
      });
    },
    [key],
  );

  return [state, update] as const;
}

export const useSmtps = () => useStore<SmtpAccount[]>(KEYS.smtps, []);
export const useLists = () => useStore<ContactList[]>(KEYS.lists, []);
export const useCampaigns = () => useStore<Campaign[]>(KEYS.campaigns, []);

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
