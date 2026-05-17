import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Daily rollover: moves unfinished scheduled tasks from prior days back to inbox.
// Called by pg_cron with the service-role key in the `apikey` header.
export const Route = createFileRoute("/api/public/rollover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const admin = createClient(
          process.env.SUPABASE_URL!,
          expected,
          { auth: { autoRefreshToken: false, persistSession: false } },
        );

        const { data, error } = await admin.rpc("rollover_unfinished_tasks");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ moved: data ?? 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
