import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Plus, Check, Play, Pause, Inbox, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EnergyChip } from "@/components/energy-chip";
import { breakDownTask, logEngagement } from "@/lib/coach.functions";
import { rolloverMyTasks } from "@/lib/rollover.functions";

export const Route = createFileRoute("/_authenticated/timeline")({
  component: TimelinePage,
});

const PX_PER_MIN = 1.6;
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;

type Energy = "low" | "medium" | "high";
type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: "inbox" | "scheduled" | "active" | "done" | "dropped";
  energy_required: Energy | null;
  scheduled_for: string | null;
  duration_minutes: number | null;
  color_token: string | null;
  started_at: string | null;
  parent_task_id: string | null;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function TimelinePage() {
  const qc = useQueryClient();
  const [now, setNow] = useState(new Date());
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [filterByEnergy, setFilterByEnergy] = useState(false);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const breakDownFn = useServerFn(breakDownTask);
  const logFn = useServerFn(logEngagement);
  const rolloverFn = useServerFn(rolloverMyTasks);

  // Silent rollover + app_open engagement once per mount
  useEffect(() => {
    rolloverFn().then((r) => {
      if (r.moved > 0) {
        qc.invalidateQueries({ queryKey: ["tasks"] });
        toast(`${r.moved} task${r.moved === 1 ? "" : "s"} back in your inbox`, {
          description: "No rush. Pick them up when you're ready.",
        });
      }
    }).catch(() => {});
    logFn({ data: { kind: "app_open" } }).catch(() => {});
  }, [rolloverFn, logFn, qc]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "today"],
    queryFn: async () => {
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

  useEffect(() => {
    const ch = supabase
      .channel("tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () =>
        qc.invalidateQueries({ queryKey: ["tasks"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const scheduled = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.scheduled_for &&
          new Date(t.scheduled_for) >= startOfToday() &&
          new Date(t.scheduled_for) < new Date(startOfToday().getTime() + 86400000),
      ),
    [tasks],
  );

  const inbox = useMemo(() => {
    let list = tasks.filter((t) => !t.scheduled_for && t.status !== "done");
    if (filterByEnergy && energy) {
      const allowed: Record<Energy, Energy[]> = {
        low: ["low"],
        medium: ["low", "medium"],
        high: ["low", "medium", "high"],
      };
      list = list.filter((t) => !t.energy_required || allowed[energy].includes(t.energy_required));
    }
    return list;
  }, [tasks, filterByEnergy, energy]);

  const doneToday = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === "done" &&
          t.scheduled_for &&
          new Date(t.scheduled_for) >= startOfToday(),
      ).length,
    [tasks],
  );

  const minutesFromDayStart = (d: Date) =>
    d.getHours() * 60 + d.getMinutes() - DAY_START_HOUR * 60;
  const totalMinutes = (DAY_END_HOUR - DAY_START_HOUR) * 60;
  const railHeight = totalMinutes * PX_PER_MIN;
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);

  const nowOffset = minutesFromDayStart(now) * PX_PER_MIN;
  const showNow = nowOffset >= 0 && nowOffset <= railHeight;
  const nowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    nowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const updateTask = async (id: string, patch: Partial<Task>) => {
    const { error } = await supabase.from("tasks").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const scheduleToNow = async (id: string) => {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    await updateTask(id, { scheduled_for: d.toISOString(), status: "scheduled" });
  };

  const startTask = async (t: Task) => {
    await updateTask(t.id, { status: "active", started_at: new Date().toISOString() });
    if ("vibrate" in navigator) navigator.vibrate?.(15);
    logFn({ data: { kind: "task_started", metadata: { id: t.id } } }).catch(() => {});
  };

  const completeTask = async (t: Task) => {
    await updateTask(t.id, { status: "done", completed_at: new Date().toISOString() } as Partial<Task>);
    if ("vibrate" in navigator) navigator.vibrate?.([10, 40, 25]);
    logFn({ data: { kind: "task_done", metadata: { id: t.id } } }).catch(() => {});
    setOpenTask(null);
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
    setOpenTask(null);
  };

  const onBreakDown = async (id: string) => {
    toast.message("Breaking that down…", { duration: 1500 });
    try {
      const r = await breakDownFn({ data: { task_id: id } });
      logFn({ data: { kind: "break_down" } }).catch(() => {});
      toast.success(`Made ${r.created} smaller step${r.created === 1 ? "" : "s"}`);
      setOpenTask(null);
    } catch {
      toast.error("Couldn't break it down");
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <header className="px-5 pt-8 pb-3 flex items-end justify-between">
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

      <div className="px-5 mb-4">
        <EnergyChip onChange={setEnergy} />
      </div>

      {inbox.length > 0 && (
        <section className="px-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Inbox className="h-3.5 w-3.5" />
              From your brain dump
            </div>
            {energy && (
              <button
                onClick={() => setFilterByEnergy((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border transition",
                  filterByEnergy
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground",
                )}
              >
                <Sparkles className="h-3 w-3" />
                Suggest for {energy}
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
            {inbox.map((t) => (
              <div
                key={t.id}
                className="shrink-0 w-[200px] rounded-xl border border-border bg-card overflow-hidden"
                style={{ borderLeftColor: `var(--color-${t.color_token ?? "task-1"})`, borderLeftWidth: 3 }}
              >
                <button
                  onClick={() => setOpenTask(t)}
                  className="w-full text-left px-3 pt-2"
                >
                  <p className="text-sm font-medium line-clamp-2">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {t.duration_minutes ?? 25}m
                    {t.energy_required && ` · ${t.energy_required}`}
                  </p>
                </button>
                <div className="flex border-t border-border/60 mt-2">
                  <button
                    onClick={() => scheduleToNow(t.id)}
                    className="flex-1 py-1.5 text-[11px] text-primary hover:bg-primary/10 transition"
                  >
                    Plan now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="relative px-5 pb-10">
        <div className="relative" style={{ height: railHeight }}>
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

          {scheduled.map((t) => {
            const start = new Date(t.scheduled_for!);
            const top = minutesFromDayStart(start) * PX_PER_MIN;
            const height = Math.max(28, (t.duration_minutes ?? 25) * PX_PER_MIN);
            const isActive = t.status === "active";
            const isDone = t.status === "done";
            const elapsed =
              isActive && t.started_at
                ? Math.min(1, Math.max(0,
                  (now.getTime() - new Date(t.started_at).getTime()) /
                  ((t.duration_minutes ?? 25) * 60_000)))
                : 0;
            return (
              <button
                key={t.id}
                onClick={() => setOpenTask(t)}
                className={cn(
                  "absolute left-14 right-0 rounded-xl overflow-hidden border border-border/60 bg-card text-left transition",
                  isDone && "opacity-50",
                )}
                style={{
                  top, height,
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
                      {t.energy_required && ` · ${t.energy_required}`}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}

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
        className="fixed bottom-20 right-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 transition z-20"
      >
        <Plus className="h-6 w-6" />
      </Link>

      <Sheet open={!!openTask} onOpenChange={(o) => !o && setOpenTask(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl border-t border-border">
          {openTask && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="text-lg leading-tight">{openTask.title}</SheetTitle>
                <SheetDescription>
                  {openTask.duration_minutes ?? 25} min
                  {openTask.energy_required && ` · ${openTask.energy_required} energy`}
                  {openTask.scheduled_for &&
                    ` · ${new Date(openTask.scheduled_for).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
                </SheetDescription>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-2 mt-6">
                {openTask.status === "scheduled" || !openTask.scheduled_for ? (
                  <Button onClick={() => startTask(openTask)} className="col-span-2 h-12 gap-2">
                    <Play className="h-4 w-4" /> Start now
                  </Button>
                ) : (
                  <Button onClick={() => updateTask(openTask.id, { status: "scheduled", started_at: null })}
                    variant="secondary" className="col-span-2 h-12 gap-2">
                    <Pause className="h-4 w-4" /> Pause
                  </Button>
                )}
                <Button onClick={() => completeTask(openTask)} variant="outline" className="gap-2">
                  <Check className="h-4 w-4" /> Done
                </Button>
                <Button onClick={() => onBreakDown(openTask.id)} variant="outline" className="gap-2">
                  <Wand2 className="h-4 w-4" /> Break down
                </Button>
                {!openTask.scheduled_for && (
                  <Button onClick={() => scheduleToNow(openTask.id)} variant="outline" className="col-span-2 gap-2">
                    <Plus className="h-4 w-4" /> Plan into today
                  </Button>
                )}
                <Button onClick={() => deleteTask(openTask.id)} variant="ghost"
                  className="col-span-2 text-muted-foreground gap-2">
                  <Trash2 className="h-4 w-4" /> Drop it
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
