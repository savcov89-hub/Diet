import type { Profile } from "../core";

const KEY = "ration-nsk.profile.v1";

export function defaultProfile(): Profile {
  const m = new Date().getMonth() + 1;
  return {
    sex: "female", age: 32, heightCm: 168, weightKg: 70, activity: "low", goal: "maintain", tier: "business", mealsPerDay: 4,
    pregnancy: "none", lactation: "none", ckd: "none", hyperkalemia: false, diabetes: "none", exclusions: [], dislikes: [],
    season: m >= 6 && m <= 9 ? "summer" : "winter",
  };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch { /* приватный режим и т.п. */ }
  return defaultProfile();
}

export function saveProfile(p: Profile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function loadTheme(): "light" | "dark" | null {
  try { return (localStorage.getItem("ration-nsk.theme") as "light" | "dark") || null; } catch { return null; }
}
export function saveTheme(t: "light" | "dark" | null) {
  try { t ? localStorage.setItem("ration-nsk.theme", t) : localStorage.removeItem("ration-nsk.theme"); } catch { /* ignore */ }
}
