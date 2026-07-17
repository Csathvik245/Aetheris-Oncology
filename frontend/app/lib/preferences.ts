/**
 * Simple local preferences — no server, same storage tier as the rest of
 * this app. Each one actually changes real app behavior (see call sites in
 * cases/page.tsx and the worksheet), not just a cosmetic toggle.
 */
import type { Difficulty } from "./mock";

export interface Preferences {
  /** Applied as the Case Library's difficulty filter on load. */
  defaultCaseDifficulty: "All" | Difficulty;
  /** Applied as the worksheet's monitoring strategy default (unless a saved draft overrides it). */
  defaultMonitoring: "weekly-cbc" | "biweekly-cbc" | "monthly-imaging";
}

const DEFAULT_PREFERENCES: Preferences = {
  defaultCaseDifficulty: "All",
  defaultMonitoring: "weekly-cbc",
};

const PREFERENCES_KEY = "aetheris:preferences";

export function getPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(p: Preferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(p));
}
