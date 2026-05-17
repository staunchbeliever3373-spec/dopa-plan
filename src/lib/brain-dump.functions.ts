import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ParseInput = z.object({
  dump_id: z.string().uuid(),
  raw_text: z.string().min(1).max(10000),
});

const ItemSchema = z.object({
  title: z.string().min(1).max(200),
  energy_required: z.enum(["low", "medium", "high"]).nullable().optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  category: z.string().max(40).nullable().optional(),
});

const TASK_COLORS = ["task-1", "task-2", "task-3", "task-4", "task-5"];

export const parseBrainDump = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ParseInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    await supabase
      .from("brain_dumps")
      .update({ status: "processing" })
      .eq("id", data.dump_id);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt =
      "You help an ADHD user turn a stream-of-consciousness brain dump into discrete tasks. " +
      "Return ONLY a JSON object: { items: [{ title, energy_required: 'low'|'medium'|'high'|null, duration_minutes: number, category: string|null }] }. " +
      "Keep titles short (under 8 words), action-oriented (start with a verb). Estimate energy honestly. " +
      "Default duration 25 minutes unless obvious. Split compound thoughts into separate items.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: data.raw_text },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      await supabase
        .from("brain_dumps")
        .update({ status: "failed", error: errText.slice(0, 500) })
        .eq("id", data.dump_id);
      throw new Error(`AI gateway error: ${res.status}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsedItems: z.infer<typeof ItemSchema>[] = [];
    try {
      const obj = JSON.parse(content);
      const arr = Array.isArray(obj?.items) ? obj.items : [];
      parsedItems = arr
        .map((it: unknown) => {
          const r = ItemSchema.safeParse(it);
          return r.success ? r.data : null;
        })
        .filter(Boolean) as z.infer<typeof ItemSchema>[];
    } catch {
      parsedItems = [];
    }

    if (parsedItems.length === 0) {
      await supabase
        .from("brain_dumps")
        .update({ status: "failed", error: "No items parsed" })
        .eq("id", data.dump_id);
      return { created: 0 };
    }

    // Create tasks
    const taskRows = parsedItems.map((it, idx) => ({
      user_id: userId,
      title: it.title,
      status: "inbox" as const,
      energy_required: it.energy_required ?? null,
      duration_minutes: it.duration_minutes ?? 25,
      color_token: TASK_COLORS[idx % TASK_COLORS.length],
      source: "brain_dump",
    }));

    const { data: insertedTasks, error: taskErr } = await supabase
      .from("tasks")
      .insert(taskRows)
      .select("id");
    if (taskErr) throw taskErr;

    const itemRows = parsedItems.map((it, idx) => ({
      dump_id: data.dump_id,
      user_id: userId,
      text: it.title,
      category: it.category ?? null,
      task_id: insertedTasks?.[idx]?.id ?? null,
    }));
    await supabase.from("brain_dump_items").insert(itemRows);

    await supabase
      .from("brain_dumps")
      .update({ status: "parsed" })
      .eq("id", data.dump_id);

    return { created: insertedTasks?.length ?? 0 };
  });
