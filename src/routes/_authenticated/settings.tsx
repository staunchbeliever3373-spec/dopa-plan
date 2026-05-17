import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PRESETS, applyTheme, loadStoredTheme, type ThemeTokens } from "@/lib/themes";
import { Check, Palette } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [activeId, setActiveId] = useState<string>("dusk");

  useEffect(() => {
    const stored = loadStoredTheme();
    if (!stored) return;
    // Match stored tokens to a preset by primary color (fast heuristic).
    const match = PRESETS.find((p) => p.tokens.primary === stored.primary);
    if (match) setActiveId(match.id);
  }, []);

  const pick = (id: string, tokens: ThemeTokens) => {
    applyTheme(tokens);
    setActiveId(id);
    if ("vibrate" in navigator) navigator.vibrate?.(8);
  };

  return (
    <div className="mx-auto max-w-md px-5 pt-8 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Make it yours</p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Theme</h2>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {PRESETS.map((p) => {
            const active = p.id === activeId;
            return (
              <button
                key={p.id}
                onClick={() => pick(p.id, p.tokens)}
                className={`text-left rounded-2xl border p-4 transition-all ${
                  active
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border hover:border-primary/40"
                }`}
                style={{ background: p.tokens.card }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-base font-semibold"
                      style={{ color: p.tokens.foreground }}
                    >
                      {p.name}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: p.tokens.mutedForeground }}
                    >
                      {p.tagline}
                    </p>
                  </div>
                  {active && (
                    <span
                      className="h-6 w-6 rounded-full flex items-center justify-center"
                      style={{
                        background: p.tokens.primary,
                        color: p.tokens.primaryForeground,
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-1.5">
                  {[
                    p.tokens.primary,
                    p.tokens.energyLow,
                    p.tokens.energyMedium,
                    p.tokens.energyHigh,
                    p.tokens.accent,
                  ].map((c, i) => (
                    <span
                      key={i}
                      className="h-6 flex-1 rounded-md"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Themes apply instantly and save to this device.
        </p>
      </section>
    </div>
  );
}
