import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Pattern detection: pulls the last 30 days of engagement events, energy logs,
// and completed tasks, then asks the AI to spot 3–5 gentle, non-judgmental
// patterns the user might find useful. The output is shame-free by design.
export const detectPatterns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 86400000).toISOString();

    const [{ data: events }, { data: energy }, { data: tasks }] = await Promise.all([
      supabase
        .from("engagement_events")
        .select("kind,occurred_at")
        .eq("user_id", userId)
        .gte("occurred_at", since),
      supabase
        .from("energy_states")
        .select("level,logged_at")
        .eq("user_id", userId)
        .gte("logged_at", since),
      supabase
        .from("tasks")
        .select("title,status,energy_required,duration_minutes,completed_at,created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .limit(200),
    ]);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const summary = {
      events: (events ?? []).map((e) => ({
        k: e.kind,
        // hour-of-day + weekday is enough signal, fewer tokens
        h: new Date(e.occurred_at).getHours(),
        d: new Date(e.occurred_at).getDay(),
      })),
      energy: (energy ?? []).map((e) => ({
        l: e.level,
        h: new Date(e.logged_at).getHours(),
        d: new Date(e.logged_at).getDay(),
      })),
      tasks: (tasks ?? []).map((t) => ({
        s: t.status,
        e: t.energy_required,
        m: t.duration_minutes,
        done: t.completed_at ? 1 : 0,
      })),
    };

    const systemPrompt =
      "You analyze an ADHD user's 30-day activity patterns. Be warm, never judgmental. " +
      "Return ONLY JSON: { insights: [{ title, body, tone: 'celebrate'|'notice'|'experiment' }] }. " +
      "Generate 3–5 short insights (title <= 6 words, body 1–2 sentences). " +
      "Celebrate streaks and wins. 'Notice' patterns gently (e.g. 'Mornings seem to be your sweet spot'). " +
      "'Experiment' = a tiny, optional suggestion. Never use the words 'overdue', 'failed', 'lazy', or 'should'.";

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
          { role: "user", content: JSON.stringify(summary) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI gateway error: ${res.status} ${errText.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    try {
      const obj = JSON.parse(content) as {
        insights?: Array<{ title: string; body: string; tone?: string }>;
      };
      const insights = (obj.insights ?? []).slice(0, 5).map((i) => ({
        title: String(i.title ?? "").slice(0, 80),
        body: String(i.body ?? "").slice(0, 280),
        tone: (["celebrate", "notice", "experiment"].includes(String(i.tone))
          ? i.tone
          : "notice") as "celebrate" | "notice" | "experiment",
      }));
      return { insights };
    } catch {
      return { insights: [] };
    }
  });
