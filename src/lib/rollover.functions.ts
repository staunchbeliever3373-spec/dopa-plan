import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Silent rollover: when the user opens their day, anything still hanging
// from yesterday quietly returns to the inbox. No "OVERDUE" badge ever.
export const rolloverMyTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("tasks")
      .update({ scheduled_for: null, status: "inbox", started_at: null })
      .eq("user_id", userId)
      .in("status", ["scheduled", "active"])
      .lt("scheduled_for", startOfToday.toISOString())
      .select("id");
    if (error) throw error;
    return { moved: data?.length ?? 0 };
  });
