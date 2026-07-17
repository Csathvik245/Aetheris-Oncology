/**
 * Local-only account profile. No server, no password — this app has no
 * database anywhere, so "account creation" is a lightweight named profile
 * stored client-side, same tier as everything else this app persists
 * (submissions, history, generated cases).
 */
export interface Profile {
  name: string;
  role: string;
  createdAt: string;
}

const PROFILE_KEY = "aetheris:profile";

export function getProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function clearProfile() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_KEY);
}

export function initials(name: string): string {
  const parts = name
    .split(" ")
    .map((w) => w.trim())
    .filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((w) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}
