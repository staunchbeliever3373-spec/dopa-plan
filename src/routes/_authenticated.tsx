import { createFileRoute, redirect, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Brain, Calendar, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto max-w-md grid grid-cols-3">
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
            Brain dump
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
