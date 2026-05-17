import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResult };
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}
type SRCtor = new () => SpeechRecognition;

export function VoiceButton({
  onAppend,
  className,
}: {
  onAppend: (text: string) => void;
  className?: string;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) t += r[0].transcript + " ";
      }
      if (t) onAppend(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
  }, [onAppend]);

  if (!supported) return null;

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
        if ("vibrate" in navigator) navigator.vibrate?.(10);
      } catch { /* already started */ }
    }
  };

  return (
    <Button
      type="button"
      variant={listening ? "default" : "outline"}
      size="icon"
      onClick={toggle}
      className={cn(
        "h-12 w-12 rounded-full transition",
        listening && "animate-pulse shadow-lg shadow-primary/40",
        className,
      )}
      aria-label={listening ? "Stop recording" : "Record voice"}
    >
      {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </Button>
  );
}
