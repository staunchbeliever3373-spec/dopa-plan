import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { parseBrainDump } from "@/lib/brain-dump.functions";
import { logEngagement } from "@/lib/coach.functions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { VoiceButton } from "@/components/voice-button";
import { toast } from "sonner";
import { Sparkles, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dump")({
  component: DumpPage,
});

function DumpPage() {
  const navigate = useNavigate();
  const parseFn = useServerFn(parseBrainDump);
  const logFn = useServerFn(logEngagement);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");

      const { data: dump, error } = await supabase
        .from("brain_dumps")
        .insert({ user_id: userData.user.id, raw_text: text.trim() })
        .select("id")
        .single();
      if (error) throw error;

      if ("vibrate" in navigator) navigator.vibrate?.([8, 30, 8]);
      toast.success("Got it. Working on it in the background.", {
        description: "You can leave this screen.",
      });
      setText("");
      navigate({ to: "/timeline" });

      // Fire and forget
      logFn({ data: { kind: "brain_dump" } }).catch(() => {});
      parseFn({ data: { dump_id: dump.id, raw_text: text.trim() } })
        .then((r) => toast.success(`Parsed ${r.created} task${r.created === 1 ? "" : "s"}`))
        .catch(() => toast.error("Couldn't parse that dump"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <button
        onClick={() => navigate({ to: "/timeline" })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="space-y-2 mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Brain dump</h1>
        <p className="text-sm text-muted-foreground">
          Empty everything onto the page. Don't organize. I'll handle that.
        </p>
      </div>

      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="laundry, that email to mom, the dentist, prep for monday meeting, grab batteries…"
        className="min-h-[40vh] text-base leading-relaxed border-0 bg-card resize-none focus-visible:ring-1"
      />

      <div className="flex items-center gap-3 mt-5">
        <VoiceButton onAppend={(t) => setText((prev) => (prev ? `${prev.trimEnd()} ${t}` : t))} />
        <Button
          onClick={onSubmit}
          disabled={busy || !text.trim()}
          size="lg"
          className="flex-1 gap-2 h-12"
        >
          <Sparkles className="h-4 w-4" />
          Send to my plan
        </Button>
      </div>
    </div>
  );
}
