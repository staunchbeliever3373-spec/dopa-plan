import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TASK_COLORS = ["task-1", "task-2", "task-3", "task-4", "task-5"];

const Sub = z.object({
  title: z.string().min(1).max(120),
  duration_minutes: z.number().int().min(5).max(120).optional(),
});

export const breakDownTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ task_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: parent, error: pErr } = await supabase
      .from("tasks")
      .select("id,title,notes,energy_required,color_token")
      .eq("id", data.task_id)
      .single();
    if (pErr || !parent) throw new Error("Task not found");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You break a single task into 3–5 tiny, concrete first steps for an ADHD user. " +
              "Return ONLY JSON: { steps: [{ title, duration_minutes }] }. " +
              "Each step starts with a verb, takes 5–25 minutes, and feels obvious to start.",
          },
          {
            role: "user",
            content: `Task: ${parent.title}${parent.notes ? `\nNotes: ${parent.notes}` : ""}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(`AI error ${res.status}`);
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let steps: z.infer<typeof Sub>[] = [];
    try {
      const obj = JSON.parse(content);
      const raw = Array.isArray(obj.steps) ? obj.steps : [];
      for (const s of raw) {
        const r = Sub.safeParse(s);
        if (r.success) steps.push(r.data);
      }
    } catch { /* noop */ }

    if (steps.length === 0) return { created: 0 };

    const rows = steps.map((s, i) => ({
      user_id: userId,
      title: s.title,
      status: "inbox" as const,
      energy_required: parent.energy_required,
      duration_minutes: s.duration_minutes ?? 15,
      color_token: parent.color_token ?? TASK_COLORS[i % TASK_COLORS.length],
      parent_task_id: parent.id,
      source: "break_down",
    }));
    const { data: ins, error } = await supabase.from("tasks").insert(rows).select("id");
    if (error) throw error;
    return { created: ins?.length ?? 0 };
  });

export const logEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      kind: z.enum([
        "brain_dump",
        "task_done",
        "task_started",
        "energy_logged",
        "app_open",
        "break_down",
      ]),
      metadata: z.record(z.string(), z.any()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("engagement_events").insert({
      user_id: userId,
      kind: data.kind,
      metadata: data.metadata ?? null,
    });
    return { ok: true };
  });

export const logEnergy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      level: z.enum(["low", "medium", "high"]),
      note: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("energy_states").insert({
      user_id: userId,
      level: data.level,
      note: data.note ?? null,
    });
    await supabase.from("engagement_events").insert({
      user_id: userId,
      kind: "energy_logged",
      metadata: { level: data.level },
    });
    return { ok: true };
  });
