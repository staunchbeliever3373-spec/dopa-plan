import { useEffect } from "react";
import { applyTheme, loadStoredTheme } from "@/lib/themes";

// Mounted once at the auth-layout root. Restores the user's saved theme tokens
// from localStorage before first paint of authenticated screens.
export function ThemeBootstrap() {
  useEffect(() => {
    const stored = loadStoredTheme();
    if (stored) applyTheme(stored);
  }, []);
  return null;
}
