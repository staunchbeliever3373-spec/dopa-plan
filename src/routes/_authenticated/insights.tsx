import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Sparkles, Battery, Wand2, PartyPopper, Eye, Lightbulb, Loader2 } from "lucide-react";
import { detectPatterns } from "@/lib/patterns.functions";

export const Route = createFileRoute("/_authenticated/insights")({
  component: InsightsPage,
});

type Event = { kind: string; occurred_at: string };
type Energy = { level: "low" | "medium" | "high"; logged_at: string };

function calcStreak(events: Event[]) {
  const days = new Set(
    events.map((e) => new Date(e.occurred_at).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

const TONE_ICON = {
  celebrate: PartyPopper,
  notice: Eye,
  experiment: Lightbulb,
} as const;

function InsightsPage() {
  const detect = useServerFn(detectPatterns);
  const patterns = useMutation({
    mutationFn: () => detect(),
  });
  const { data } = useQuery({
    queryKey: ["insights"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const [{ data: events }, { data: energy }] = await Promise.all([
        supabase
          .from("engagement_events")
          .select("kind,occurred_at")
          .eq("user_id", u.user.id)
          .gte("occurred_at", since)
          .order("occurred_at", { ascending: false }),
        supabase
          .from("energy_states")
          .select("level,logged_at")
          .eq("user_id", u.user.id)
          .gte("logged_at", since)
          .order("logged_at", { ascending: false }),
      ]);
      return {
        events: (events ?? []) as Event[],
        energy: (energy ?? []) as Energy[],
      };
    },
  });

  const streak = calcStreak(data?.events ?? []);
  const donesWeek = (data?.events ?? []).filter(
    (e) => e.kind === "task_done" && new Date(e.occurred_at) > new Date(Date.now() - 7 * 86400000),
  ).length;
  const dumpsWeek = (data?.events ?? []).filter(
    (e) => e.kind === "brain_dump" && new Date(e.occurred_at) > new Date(Date.now() - 7 * 86400000),
  ).length;

  // 14-day heatmap of energy
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (13 - i));
    return d;
  });
  const energyByDay = new Map<string, Energy["level"]>();
  for (const e of data?.energy ?? []) {
    const key = new Date(e.logged_at).toISOString().slice(0, 10);
    if (!energyByDay.has(key)) energyByDay.set(key, e.level);
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-8 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Your patterns</p>
        <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Flame className="h-6 w-6" />
        </div>
        <div>
          <p className="text-3xl font-semibold leading-none">{streak}</p>
          <p className="text-sm text-muted-foreground mt-1">
            day{streak === 1 ? "" : "s"} of showing up
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <p className="text-2xl font-semibold mt-2">{donesWeek}</p>
          <p className="text-xs text-muted-foreground">tasks finished · 7d</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <p className="text-2xl font-semibold mt-2">{dumpsWeek}</p>
          <p className="text-xs text-muted-foreground">brain dumps · 7d</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Battery className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Energy · last 14 days</p>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const key = d.toISOString().slice(0, 10);
            const lvl = energyByDay.get(key);
            return (
              <div
                key={key}
                className="aspect-square rounded-md border border-border"
                title={`${key}${lvl ? ` · ${lvl}` : ""}`}
                style={{
                  background: lvl ? `var(--color-energy-${lvl})` : "transparent",
                  opacity: lvl ? 0.85 : 0.4,
                }}
              />
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          No bars means no shame — just data you haven't logged yet.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Patterns</p>
          </div>
          <button
            onClick={() => patterns.mutate()}
            disabled={patterns.isPending}
            className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-60 flex items-center gap-1.5"
          >
            {patterns.isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Reading
              </>
            ) : (
              "Reflect"
            )}
          </button>
        </div>
        {patterns.data?.insights?.length ? (
          <ul className="space-y-2.5">
            {patterns.data.insights.map((ins, i) => {
              const Icon = TONE_ICON[ins.tone] ?? Eye;
              return (
                <li
                  key={i}
                  className="rounded-xl border border-border bg-background/40 p-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 h-7 w-7 shrink-0 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{ins.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {ins.body}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            Tap Reflect for a gentle AI read of the last 30 days. No judgment, just patterns.
          </p>
        )}
      </div>
    </div>
  );
}
