import { createFileRoute, redirect, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Calendar, LogOut, BarChart3, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeBootstrap } from "@/components/theme-bootstrap";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  // No useEffect-based redirect here. beforeLoad gates the route, and the
  // root onAuthStateChange listener invalidates the router on real sign-out,
  // which re-runs beforeLoad. Redirecting on transient null-user states
  // (token refresh, remount) was kicking signed-in users back to /auth.

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ThemeBootstrap />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto max-w-md grid grid-cols-5">
          <Link
            to="/timeline"
            className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground [&.active]:text-primary"
            activeProps={{ className: "active" }}
          >
            <Calendar className="h-5 w-5" />
            Today
          </Link>
          <Link
            to="/dump"
            className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground [&.active]:text-primary"
            activeProps={{ className: "active" }}
          >
            <Brain className="h-5 w-5" />
            Dump
          </Link>
          <Link
            to="/insights"
            className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground [&.active]:text-primary"
            activeProps={{ className: "active" }}
          >
            <BarChart3 className="h-5 w-5" />
            Insights
          </Link>
          <Link
            to="/settings"
            className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground [&.active]:text-primary"
            activeProps={{ className: "active" }}
          >
            <Settings className="h-5 w-5" />
            Theme
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </nav>
    </div>
  );
}

export { Button };
