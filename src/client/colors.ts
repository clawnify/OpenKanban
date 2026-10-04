// Palette keys match COLOR_KEYS in src/server/index.ts
export const COLOR_KEYS = ["indigo", "violet", "pink", "amber", "emerald", "cyan", "blue", "red"] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

interface ColorShades {
  label: string;
  /** List header background; white text sits on it */
  header: string;
  /** Card background and border when the card has this color */
  cardBg: string;
  cardBorder: string;
}

export const COLORS: Record<ColorKey, ColorShades> = {
  indigo: { label: "Indigo", header: "#6366f1", cardBg: "#e0e7ff", cardBorder: "#c7d2fe" },
  violet: { label: "Violet", header: "#8b5cf6", cardBg: "#ede9fe", cardBorder: "#ddd6fe" },
  pink: { label: "Pink", header: "#ec4899", cardBg: "#fce7f3", cardBorder: "#fbcfe8" },
  amber: { label: "Amber", header: "#f59e0b", cardBg: "#fef3c7", cardBorder: "#fde68a" },
  emerald: { label: "Emerald", header: "#10b981", cardBg: "#d1fae5", cardBorder: "#a7f3d0" },
  cyan: { label: "Cyan", header: "#06b6d4", cardBg: "#cffafe", cardBorder: "#a5f3fc" },
  blue: { label: "Blue", header: "#3b82f6", cardBg: "#dbeafe", cardBorder: "#bfdbfe" },
  red: { label: "Red", header: "#ef4444", cardBg: "#fee2e2", cardBorder: "#fecaca" },
};

/** The color a new list gets by default, continuing the palette rotation */
export function nextListColor(listCount: number): ColorKey {
  return COLOR_KEYS[listCount % COLOR_KEYS.length];
}
