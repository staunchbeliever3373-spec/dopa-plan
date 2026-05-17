import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logEnergy } from "@/lib/coach.functions";
import { cn } from "@/lib/utils";
import { Battery, BatteryLow, BatteryMedium, BatteryFull } from "lucide-react";
import { toast } from "sonner";

type Level = "low" | "medium" | "high";

const OPTIONS: { level: Level; label: string; Icon: typeof Battery }[] = [
  { level: "low", label: "Low", Icon: BatteryLow },
  { level: "medium", label: "Mid", Icon: BatteryMedium },
  { level: "high", label: "High", Icon: BatteryFull },
];

export function EnergyChip({ onChange }: { onChange?: (l: Level | null) => void }) {
  const qc = useQueryClient();
  const log = useServerFn(logEnergy);
  const [busy, setBusy] = useState(false);

  const { data: current } = useQuery({
    queryKey: ["energy", "latest"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("energy_states")
        .select("level,logged_at")
        .eq("user_id", u.user.id)
        .gte("logged_at", since)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data?.level ?? null) as Level | null;
    },
  });

  useEffect(() => onChange?.(current ?? null), [current, onChange]);

  const pick = async (lvl: Level) => {
    setBusy(true);
    try {
      await log({ data: { level: lvl } });
      if ("vibrate" in navigator) navigator.vibrate?.(8);
      await qc.invalidateQueries({ queryKey: ["energy"] });
      toast.success(`Got it — feeling ${lvl}`, { duration: 1500 });
    } catch (e) {
      toast.error("Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        How's your energy?
      </p>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ level, label, Icon }) => {
          const active = current === level;
          return (
            <button
              key={level}
              disabled={busy}
              onClick={() => pick(level)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 rounded-xl transition border",
                active
                  ? "border-transparent text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
              )}
              style={
                active
                  ? { background: `var(--color-energy-${level})`, color: "var(--background)" }
                  : undefined
              }
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
