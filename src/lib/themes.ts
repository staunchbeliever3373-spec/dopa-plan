// Theme presets — each defines the same set of design tokens the app reads
// from CSS custom properties at runtime. The active theme's tokens are
// applied to document.documentElement.style so changes feel instant.

export type ThemeTokens = {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  border: string;
  energyLow: string;
  energyMedium: string;
  energyHigh: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  tagline: string;
  tokens: ThemeTokens;
};

export const PRESETS: ThemePreset[] = [
  {
    id: "dusk",
    name: "Calm Dusk",
    tagline: "Default. Low-contrast warm dark.",
    tokens: {
      background: "oklch(0.18 0.02 270)",
      foreground: "oklch(0.94 0.01 270)",
      card: "oklch(0.22 0.025 270)",
      primary: "oklch(0.78 0.12 200)",
      primaryForeground: "oklch(0.18 0.02 270)",
      muted: "oklch(0.26 0.025 270)",
      mutedForeground: "oklch(0.68 0.02 270)",
      accent: "oklch(0.32 0.04 270)",
      border: "oklch(0.32 0.025 270)",
      energyLow: "oklch(0.72 0.1 250)",
      energyMedium: "oklch(0.78 0.13 160)",
      energyHigh: "oklch(0.78 0.16 50)",
    },
  },
  {
    id: "forest",
    name: "Forest Floor",
    tagline: "Mossy greens. Grounding.",
    tokens: {
      background: "oklch(0.2 0.025 160)",
      foreground: "oklch(0.94 0.02 140)",
      card: "oklch(0.24 0.03 160)",
      primary: "oklch(0.78 0.14 150)",
      primaryForeground: "oklch(0.18 0.02 160)",
      muted: "oklch(0.28 0.03 160)",
      mutedForeground: "oklch(0.7 0.02 140)",
      accent: "oklch(0.32 0.04 150)",
      border: "oklch(0.32 0.03 160)",
      energyLow: "oklch(0.72 0.08 220)",
      energyMedium: "oklch(0.78 0.13 150)",
      energyHigh: "oklch(0.8 0.15 80)",
    },
  },
  {
    id: "sunrise",
    name: "Sunrise",
    tagline: "Warm peach. Light mode.",
    tokens: {
      background: "oklch(0.97 0.015 60)",
      foreground: "oklch(0.22 0.03 30)",
      card: "oklch(0.99 0.01 60)",
      primary: "oklch(0.65 0.16 35)",
      primaryForeground: "oklch(0.98 0.01 60)",
      muted: "oklch(0.93 0.02 60)",
      mutedForeground: "oklch(0.5 0.03 30)",
      accent: "oklch(0.9 0.04 50)",
      border: "oklch(0.88 0.02 60)",
      energyLow: "oklch(0.72 0.1 240)",
      energyMedium: "oklch(0.72 0.14 160)",
      energyHigh: "oklch(0.72 0.17 40)",
    },
  },
  {
    id: "mono",
    name: "Paper Ink",
    tagline: "Achromatic. Minimal distraction.",
    tokens: {
      background: "oklch(0.96 0 0)",
      foreground: "oklch(0.2 0 0)",
      card: "oklch(1 0 0)",
      primary: "oklch(0.25 0 0)",
      primaryForeground: "oklch(0.98 0 0)",
      muted: "oklch(0.92 0 0)",
      mutedForeground: "oklch(0.45 0 0)",
      accent: "oklch(0.88 0 0)",
      border: "oklch(0.85 0 0)",
      energyLow: "oklch(0.65 0 0)",
      energyMedium: "oklch(0.5 0 0)",
      energyHigh: "oklch(0.3 0 0)",
    },
  },
  {
    id: "twilight",
    name: "Deep Twilight",
    tagline: "Indigo focus mode.",
    tokens: {
      background: "oklch(0.14 0.04 280)",
      foreground: "oklch(0.93 0.02 280)",
      card: "oklch(0.19 0.05 280)",
      primary: "oklch(0.75 0.15 290)",
      primaryForeground: "oklch(0.14 0.04 280)",
      muted: "oklch(0.24 0.04 280)",
      mutedForeground: "oklch(0.65 0.03 280)",
      accent: "oklch(0.3 0.06 290)",
      border: "oklch(0.3 0.04 280)",
      energyLow: "oklch(0.72 0.1 230)",
      energyMedium: "oklch(0.78 0.13 170)",
      energyHigh: "oklch(0.8 0.17 340)",
    },
  },
];

const STORAGE_KEY = "adhd.theme.tokens";

export function applyTheme(tokens: ThemeTokens) {
  const r = document.documentElement.style;
  r.setProperty("--background", tokens.background);
  r.setProperty("--foreground", tokens.foreground);
  r.setProperty("--card", tokens.card);
  r.setProperty("--card-foreground", tokens.foreground);
  r.setProperty("--popover", tokens.card);
  r.setProperty("--popover-foreground", tokens.foreground);
  r.setProperty("--primary", tokens.primary);
  r.setProperty("--primary-foreground", tokens.primaryForeground);
  r.setProperty("--secondary", tokens.muted);
  r.setProperty("--secondary-foreground", tokens.foreground);
  r.setProperty("--muted", tokens.muted);
  r.setProperty("--muted-foreground", tokens.mutedForeground);
  r.setProperty("--accent", tokens.accent);
  r.setProperty("--accent-foreground", tokens.foreground);
  r.setProperty("--border", tokens.border);
  r.setProperty("--input", tokens.muted);
  r.setProperty("--ring", tokens.primary);
  r.setProperty("--energy-low", tokens.energyLow);
  r.setProperty("--energy-medium", tokens.energyMedium);
  r.setProperty("--energy-high", tokens.energyHigh);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    /* noop */
  }
}

export function loadStoredTheme(): ThemeTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ThemeTokens;
  } catch {
    return null;
  }
}
