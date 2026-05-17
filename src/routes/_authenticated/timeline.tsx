import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Check, Play, Pause, Inbox } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/timeline")({
  component: TimelinePage,
});

const PX_PER_MIN = 1.6; // 96px/hour
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;

type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: "inbox" | "scheduled" | "active" | "done" | "dropped";
  energy_required: "low" | "medium" | "high" | null;
  scheduled_for: string | null;
  duration_minutes: number | null;
  color_token: string | null;
  started_at: string | null;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function TimelinePage() {
  const qc = useQueryClient();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "today"],
    queryFn: async () => {
      const day = startOfToday();
      const end = new Date(day);
      end.setDate(end.getDate() + 1);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [] as Task[];

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userData.user.id)
        .neq("status", "dropped")
        .order("scheduled_for", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => qc.invalidateQueries({ queryKey: ["tasks"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const scheduled = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.scheduled_for &&
          new Date(t.scheduled_for) >= startOfToday() &&
          new Date(t.scheduled_for) <
            new Date(startOfToday().getTime() + 24 * 60 * 60 * 1000),
      ),
    [tasks],
  );
  const inbox = useMemo(() => tasks.filter((t) => !t.scheduled_for && t.status !== "done"), [tasks]);
  const doneToday = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks],
  );

  const minutesFromDayStart = (d: Date) =>
    d.getHours() * 60 + d.getMinutes() - DAY_START_HOUR * 60;

  const totalMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60;
  const railHeight = totalMinutes * PX_PER_MIN;

  const hours = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) hours.push(h);

  const nowOffset = minutesFromDayStart(now) * PX_PER_MIN;
  const showNow = nowOffset >= 0 && nowOffset <= railHeight;
  const nowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    nowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const updateTask = async (id: string, patch: Partial<Task>) => {
    const { error } = await supabase.from("tasks").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const scheduleToNow = async (id: string) => {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    await updateTask(id, {
      scheduled_for: d.toISOString(),
      status: "scheduled",
    });
  };

  return (
    <div className="mx-auto max-w-md">
      <header className="px-5 pt-8 pb-4 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {now.toLocaleDateString(undefined, { weekday: "long" })}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {now.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-primary">{doneToday}</p>
          <p className="text-xs text-muted-foreground">done today</p>
        </div>
      </header>

      {/* Inbox strip */}
      {inbox.length > 0 && (
        <section className="px-5 mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Inbox className="h-3.5 w-3.5" />
            From your brain dump — drop into the day
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
            {inbox.map((t) => (
              <button
                key={t.id}
                onClick={() => scheduleToNow(t.id)}
                className="shrink-0 max-w-[200px] text-left rounded-xl border border-border bg-card px-3 py-2 hover:border-primary/50 transition"
                style={{ borderLeftColor: `var(--color-${t.color_token ?? "task-1"})`, borderLeftWidth: 3 }}
              >
                <p className="text-sm font-medium truncate">{t.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t.duration_minutes ?? 25}m · tap to add
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      <div className="relative px-5 pb-10">
        <div className="relative" style={{ height: railHeight }}>
          {/* Hour lines */}
          {hours.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 flex items-start gap-3"
              style={{ top: (h - DAY_START_HOUR) * 60 * PX_PER_MIN }}
            >
              <span className="w-10 -mt-2 text-[11px] tabular-nums text-muted-foreground">
                {h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}
              </span>
              <div className="flex-1 border-t border-border/40" />
            </div>
          ))}

          {/* Task blocks */}
          {scheduled.map((t) => {
            const start = new Date(t.scheduled_for!);
            const top = minutesFromDayStart(start) * PX_PER_MIN;
            const height = Math.max(28, (t.duration_minutes ?? 25) * PX_PER_MIN);
            const isActive = t.status === "active";
            const isDone = t.status === "done";
            const elapsed =
              isActive && t.started_at
                ? Math.min(
                    1,
                    Math.max(
                      0,
                      (now.getTime() - new Date(t.started_at).getTime()) /
                        ((t.duration_minutes ?? 25) * 60_000),
                    ),
                  )
                : 0;
            return (
              <div
                key={t.id}
                className={cn(
                  "absolute left-14 right-0 rounded-xl overflow-hidden border border-border/60 bg-card transition",
                  isDone && "opacity-50",
                )}
                style={{
                  top,
                  height,
                  borderLeftColor: `var(--color-${t.color_token ?? "task-1"})`,
                  borderLeftWidth: 4,
                }}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 bg-primary/10 pointer-events-none"
                    style={{ width: `${(1 - elapsed) * 100}%`, transition: "width 30s linear" }}
                  />
                )}
                <div className="relative h-full p-3 flex flex-col justify-between">
                  <div>
                    <p className={cn("text-sm font-medium leading-tight", isDone && "line-through")}>
                      {t.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      {" · "}{t.duration_minutes ?? 25}m
                      {t.energy_required && ` · ${t.energy_required} energy`}
                    </p>
                  </div>
                  {!isDone && (
                    <div className="flex gap-1 self-end">
                      {isActive ? (
                        <Button size="sm" variant="ghost" className="h-7 px-2"
                          onClick={() => updateTask(t.id, { status: "scheduled", started_at: null })}>
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 px-2"
                          onClick={() => updateTask(t.id, { status: "active", started_at: new Date().toISOString() })}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 px-2"
                        onClick={() => updateTask(t.id, { status: "done", completed_at: new Date().toISOString() } as Partial<Task>)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* NOW line */}
          {showNow && (
            <div
              ref={nowRef}
              className="absolute left-0 right-0 flex items-center gap-2 pointer-events-none z-10"
              style={{ top: nowOffset }}
            >
              <span className="w-10 text-[11px] font-medium tabular-nums text-primary">
                {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </span>
              <div className="flex-1 h-px bg-primary" />
              <div className="h-2 w-2 rounded-full bg-primary -ml-1" />
            </div>
          )}
        </div>
      </div>

      <Link
        to="/dump"
        className="fixed bottom-20 right-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 transition"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
