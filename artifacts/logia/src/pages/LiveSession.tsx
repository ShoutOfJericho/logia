import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import {
  Mic, MicOff, Pause, Square, Sparkles, BookOpen, Loader2,
  AlertTriangle, ArrowLeft, Notebook, Volume2,
} from "lucide-react";
import {
  useGetSession,
  useGetPassage,
  useUpdateSession,
  getGetSessionQueryKey,
  getGetPassageQueryKey,
  type TranscriptSegment,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { VoiceAnalyzer } from "@/lib/voiceAnalysis";
import {
  correctTranscript,
  detectAhaPhrase,
  isLexiconReady,
} from "@/lib/bibleLexicon";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
type Mode = "reading" | "reflection";

interface PendingSegment {
  id: string;
  kind: Mode;
  startedAtMs: number;
  endedAtMs: number;
  text: string;
}

export default function LiveSession() {
  const [, params] = useRoute("/session/:id/live");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const sessionId = params?.id ?? "";

  const session = useGetSession(sessionId, {
    query: { queryKey: getGetSessionQueryKey(sessionId), enabled: !!sessionId },
  });
  const passage = useGetPassage(
    session.data?.book ?? "",
    session.data?.chapter ?? 0,
    {
      query: {
        queryKey: getGetPassageQueryKey(
          session.data?.book ?? "",
          session.data?.chapter ?? 0,
        ),
        enabled: !!session.data,
      },
    },
  );

  const recognition = useSpeechRecognition();
  const analyzerRef = useRef<VoiceAnalyzer | null>(null);
  const transcriptRef = useRef("");
  const [mode, setMode] = useState<Mode>("reading");
  const [isActive, setIsActive] = useState(false);
  const [originMs, setOriginMs] = useState<number | null>(null);
  const [segmentStartMs, setSegmentStartMs] = useState<number>(0);
  const [excitement, setExcitement] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [appendedSegments, setAppendedSegments] = useState<TranscriptSegment[]>([]);
  const [recentAha, setRecentAha] = useState<{ phrase: string; at: number } | null>(null);

  const update = useUpdateSession();

  const queryClient = useQueryClient();

  const persistedSegments = useMemo(() => {
    return ((session.data as { segments?: TranscriptSegment[] } | undefined)
      ?.segments ?? []) as TranscriptSegment[];
  }, [session.data]);



  const displayedSegments = useMemo(() => {
    const byId = new Map<string, TranscriptSegment>();

    for (const segment of persistedSegments) {
      byId.set(segment.id, segment);
    }

    for (const segment of appendedSegments) {
      byId.set(segment.id, segment);
    }

    return Array.from(byId.values()).sort(
      (a, b) => a.startedAt - b.startedAt,
    );
  }, [persistedSegments, appendedSegments]);
  

  useEffect(() => {
    transcriptRef.current = `${recognition.finalTranscript} ${recognition.interimTranscript}`.trim();
  }, [recognition.finalTranscript, recognition.interimTranscript]);

  // Cleanup
  useEffect(() => {
    return () => {
      analyzerRef.current?.stop();
      recognition.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const startListening = useCallback(async () => {
  if (!session.data) return;

  try {
    const now = Date.now();
    setOriginMs(now);
    setSegmentStartMs(0);
    setIsActive(true);

    recognition.reset();
    recognition.start();

    window.setTimeout(async () => {
      try {
        const analyzer = new VoiceAnalyzer();
        await analyzer.start();
        analyzerRef.current = analyzer;
      } catch (err) {
        console.warn("Voice analyzer unavailable", err);
      }
    }, 500);
  } catch (err) {
    console.error(err);
    toast({
      title: "Microphone error",
      description: "Unable to start listening.",
      variant: "destructive",
    });
  }
}, [session.data, recognition, toast]);

const flushSegment = useCallback(
  (kind: Mode, endMs: number): PendingSegment | null => {
    const finalText = recognition.consumeTranscript().trim();
    const interimText = recognition.interimTranscript.trim();

    const text = `${finalText} ${interimText}`.trim();
    if (!text) return null;

    const corrected = correctTranscript(text);
    const id = `${sessionId}-${endMs}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      id,
      kind,
      startedAtMs: segmentStartMs,
      endedAtMs: endMs,
      text: corrected,
    };
  },
  [recognition, recognition.interimTranscript, sessionId, segmentStartMs],
);
  const persistSegment = useCallback(
    async (pending: PendingSegment) => {
      if (!analyzerRef.current) return;
      const stats = analyzerRef.current.statsForRange(
        pending.startedAtMs,
        pending.endedAtMs,
        originMs ?? Date.now(),
      );
      const excitementSamples =
        analyzerRef.current.samplesForRange?.(
          pending.startedAtMs,
          pending.endedAtMs,
          originMs ?? Date.now(),
        ) ?? [];
      const aha = pending.kind === "reflection" ? detectAhaPhrase(pending.text) : null;
      const segment: TranscriptSegment = {
        id: pending.id,
        kind: pending.kind,
        text: pending.text,
        startedAt: pending.startedAtMs,
        endedAt: pending.endedAtMs,
        excitement: stats.excitement,
        ...( { excitementSamples } as any ),
        f0Mean: stats.f0Mean,
        f0Std: stats.f0Std,
        jitter: stats.jitter,
        shimmer: stats.shimmer,
        hnr: stats.hnr,
        isAha: !!aha,
        ahaPhrase: aha,
      };
      setAppendedSegments((prev) => [...prev, segment]);
      if (aha) {
        setRecentAha({ phrase: aha, at: Date.now() });
        setTimeout(() => setRecentAha((r) => (r && r.phrase === aha ? null : r)), 4000);
      }
      try {
        await update.mutateAsync({
          id: sessionId,
          data: { appendSegments: [segment] },
        });

        await queryClient.invalidateQueries({
          queryKey: getGetSessionQueryKey(sessionId),
        });
        await session.refetch();
      } catch (err) {
        console.warn("Failed to persist segment", err);
      }
    },
    [originMs, sessionId, update, queryClient],
  );
  // Tick elapsed time
    useEffect(() => {
      if (!isActive || originMs === null) return;

      console.log("ELAPSED TIMER ACTIVE");

      const id = window.setInterval(() => {
        const nowElapsed = Date.now() - originMs;

        setElapsedMs(nowElapsed);

        const a = analyzerRef.current?.recentExcitement() ?? 0;
        setExcitement(a);

        // Auto-save a small segment every ~3 seconds
        if (nowElapsed - segmentStartMs > 3000) {
          const text = transcriptRef.current.trim();

          if (text) {
            const pending: PendingSegment = {
              id: `${sessionId}-${nowElapsed}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,
              kind: mode,
              startedAtMs: segmentStartMs,
              endedAtMs: nowElapsed,
              text: correctTranscript(text),
            };

            console.log("SAVING SEGMENT", pending.text);

            void persistSegment(pending);

            transcriptRef.current = "";
            recognition.reset();
            setSegmentStartMs(nowElapsed);
          }
        }
      }, 200);

      return () => window.clearInterval(id);
    }, [
      isActive,
      originMs,
      segmentStartMs,
      sessionId,
      mode,
      persistSegment,
      recognition,
    ]);
  const handleSwitchMode = useCallback(
    (next: Mode) => {
      if (mode === next) return;
      const endMs = originMs ? Date.now() - originMs : segmentStartMs;
      const pending = flushSegment(mode, endMs);

      console.log("AUTO FLUSH", {
        endMs,
        segmentStartMs,
        pending,
        final: recognition.finalTranscript,
        interim: recognition.interimTranscript,
      });

      if (pending) void persistSegment(pending);

      setSegmentStartMs(endMs);
      setMode(next);
    },
    [mode, originMs, segmentStartMs, flushSegment, persistSegment],
  );

  const handlePauseResume = useCallback(() => {
    if (isActive) {
      const endMs = originMs ? Date.now() - originMs : segmentStartMs;
      const pending = flushSegment(mode, endMs);
      if (pending) void persistSegment(pending);
      recognition.stop();
      setIsActive(false);
    } else {
      recognition.start();
      setIsActive(true);
    }
  }, [isActive, originMs, segmentStartMs, mode, flushSegment, persistSegment, recognition]);

  const handleEndSession = useCallback(async () => {
    if (originMs !== null) {
      const endMs = Date.now() - originMs;
      const pending = flushSegment(mode, endMs);
      if (pending) await persistSegment(pending);
    }
    recognition.stop();
    await analyzerRef.current?.stop();
    analyzerRef.current = null;

    try {
      await update.mutateAsync({
        id: sessionId,
        data: { finalize: true, endedAt: new Date().toISOString() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save session";
      toast({ title: "Couldn't save", description: message, variant: "destructive" });
    }
    setLocation(`/session/${sessionId}`);
  }, [
    originMs,
    mode,
    flushSegment,
    persistSegment,
    recognition,
    update,
    sessionId,
    setLocation,
    toast,
  ]);

  // Live transcript shown as you read
  const liveDraft = useMemo(() => {
    const final = isLexiconReady()
      ? correctTranscript(recognition.finalTranscript)
      : recognition.finalTranscript;
    return { final, interim: recognition.interimTranscript };
  }, [recognition.finalTranscript, recognition.interimTranscript]);

  if (!sessionId) {
    return (
      <div className="px-6 py-10 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Session not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-sidebar/60 sticky top-0 z-10 backdrop-blur">
        <div className="px-6 md:px-10 py-3 flex items-center justify-between gap-3">
          <Link href={`/session/${sessionId}`} data-testid="link-exit">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" /> Exit
            </Button>
          </Link>
          <div className="text-center min-w-0">
            <div className="font-serif text-base md:text-lg truncate">
              {session.data ? `${session.data.book} ${session.data.chapter}` : "Loading…"}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Live session · {formatClock(elapsedMs)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="button-end-session"
              onClick={handleEndSession}
              variant="default"
              size="sm"
              className="gap-2"
              disabled={update.isPending && !isActive}
            >
              {update.isPending && !isActive ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              End & save
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-px bg-border">
        {/* SCRIPTURE PANE */}
        <section className="bg-card paper p-6 md:p-10 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              <BookOpen className="h-3.5 w-3.5" />
              {passage.data?.translation ?? "World English Bible"}
            </div>
            {passage.isLoading || session.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : passage.error ? (
              <PassageUnavailable
                book={session.data?.book ?? ""}
                chapter={session.data?.chapter ?? 0}
              />
            ) : passage.data ? (
              <article>
                <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-6">
                  {passage.data.book}{" "}
                  <span className="text-primary">{passage.data.chapter}</span>
                </h2>
                <div className="font-scripture text-[1.32rem] md:text-[1.42rem] leading-[1.7] text-foreground/95">
                  {passage.data.verses.map((v) => (
                    <span key={v.verse}>
                      <sup className="verse-num">{v.verse}</sup>
                      {v.text.trim()}{" "}
                    </span>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        </section>

        {/* CAPTURE PANE */}
        <section className="bg-background p-6 md:p-10 flex flex-col">
          <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
            <ModeToggle mode={mode} onChange={handleSwitchMode} disabled={!isActive} />

            <Card className="paper mt-5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    {mode === "reading" ? (
                      <>
                        <Volume2 className="h-3.5 w-3.5" /> What you're reading
                      </>
                    ) : (
                      <>
                        <Notebook className="h-3.5 w-3.5" /> What you're hearing yourself think
                      </>
                    )}
                  </div>
                  <ExcitementMeter value={excitement} active={isActive} />
                </div>
                <div
                  data-testid="text-live-transcript"
                  className={cn(
                    "min-h-[140px] font-serif text-lg leading-relaxed",
                    mode === "reflection" && "italic",
                  )}
                >
                  {liveDraft.final && (
                    <span className="text-foreground">{liveDraft.final}</span>
                  )}
                  {liveDraft.interim && (
                    <span className="text-muted-foreground/80">
                      {liveDraft.final ? " " : ""}
                      {liveDraft.interim}
                    </span>
                  )}
                  {!liveDraft.final && !liveDraft.interim && (
                    <span className="text-muted-foreground italic">
                      {isActive
                        ? mode === "reading"
                          ? "Begin reading the passage aloud…"
                          : "Speak whatever stirs in you. Try saying things like 'what's interesting is…' or 'really crucial.'"
                        : "Press the microphone to begin."}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {recognition.error && (
              <div className="mt-3 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {recognition.error}
              </div>
            )}

            {recentAha && (
              <div
                data-testid="banner-aha"
                className="mt-3 animate-fade-up rounded-md border border-primary/40 bg-primary/10 px-4 py-3 flex items-center gap-3"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary">Aha moment</div>
                  <div className="font-serif italic">"{recentAha.phrase}"</div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
                This session so far · {displayedSegments.length} segment
                {displayedSegments.length === 1 ? "" : "s"}
              </h3>
              <div className="space-y-3 max-h-[28vh] overflow-y-auto pr-2">
                {displayedSegments.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Captured segments will appear here as you switch between reading and
                    reflection.
                  </p>
                ) : (
                  displayedSegments.slice().reverse().map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        "border-l-2 pl-3 py-1",
                        s.kind === "reading"
                          ? "border-muted-foreground/30"
                          : "border-primary/60",
                      )}
                    >
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                        <span>{s.kind === "reading" ? "Reading" : "Reflection"}</span>
                        <span>· {formatClock(s.startedAt)}</span>
                        {s.isAha && (
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary border-primary/20 h-4 gap-1"
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            aha
                          </Badge>
                        )}
                      </div>
                      <div
                        className={cn(
                          "font-serif text-sm leading-snug mt-0.5",
                          s.kind === "reflection" && "italic",
                        )}
                      >
                        {s.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="max-w-xl mx-auto w-full mt-6 pt-4 border-t border-border flex items-center justify-between gap-3">
            {!isActive && originMs === null ? (
              <Button
                data-testid="button-start-listening"
                size="lg"
                className="flex-1 gap-2"
                onClick={startListening}
              >
                <Mic className="h-4 w-4" /> Start listening
              </Button>
            ) : (
              <>
                <Button
                  data-testid="button-pause-resume"
                  size="lg"
                  variant="secondary"
                  className="flex-1 gap-2"
                  onClick={handlePauseResume}
                >
                  {isActive ? (
                    <>
                      <Pause className="h-4 w-4" /> Pause
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" /> Resume
                    </>
                  )}
                </Button>
                <RecordingIndicator active={isActive} />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg" role="tablist">
      {(["reading", "reflection"] as const).map((m) => (
        <button
          key={m}
          data-testid={`button-mode-${m}`}
          disabled={disabled}
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          className={cn(
            "rounded-md py-2 text-sm font-medium transition-colors",
            mode === m
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          {m === "reading" ? "Reading aloud" : "Reflecting"}
        </button>
      ))}
    </div>
  );
}

function ExcitementMeter({ value, active }: { value: number; active: boolean }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2" data-testid="meter-excitement">
      <div className="relative h-2 w-24 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-[width] duration-300 rounded-full",
            value > 0.7
              ? "bg-primary glow-spike"
              : value > 0.45
              ? "bg-primary/80"
              : "bg-muted-foreground/40",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
        {active ? `${pct}%` : "—"}
      </span>
    </div>
  );
}

function RecordingIndicator({ active }: { active: boolean }) {
  return (
    <div
      className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground px-3"
      aria-label={active ? "Recording" : "Paused"}
    >
      {active ? (
        <>
          <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-breathe" />
          Listening
        </>
      ) : (
        <>
          <MicOff className="h-3.5 w-3.5" />
          Paused
        </>
      )}
    </div>
  );
}

function PassageUnavailable({ book, chapter }: { book: string; chapter: number }) {
  return (
    <div className="border border-dashed border-border rounded-lg p-6 text-center">
      <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
      <p className="font-serif text-lg">
        Couldn't load {book} {chapter}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        You can still read from your own Bible — we'll capture everything you say.
      </p>
    </div>
  );
}
