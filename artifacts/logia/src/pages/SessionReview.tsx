import { useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { findGreekLexicalCards } from "@/lib/greekLexicalCards";
import { findGreekStudyNotes } from "@/lib/greekStudyNotes";
import { findTheologyNotes } from "@/lib/theologyNotes";
import { findWordStudies } from "@/lib/wordStudies";
import { generateSermonFlow } from "@/lib/sermonFlow";
import {
  ArrowLeft,
  Sparkles,
  Trash2,
  Hourglass,
  Activity,
  BookOpen,
  Notebook,
  Volume2,
  Quote,
  Pencil,
  Check,
} from "lucide-react";
import {
  useGetSession,
  useGetPassage,
  useUpdateSession,
  useDeleteSession,
  getGetSessionQueryKey,
  getGetPassageQueryKey,
  type TranscriptSegment,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { formatClock, formatDuration, formatExcitement } from "@/lib/format";
import { cn } from "@/lib/utils";
import { generateQuoteAnchors } from "@/lib/quoteAnchors";


const importancePhrases = [
  "this is important",
  "so important",
  "really important",
  "this matters",
  "i need to remember",
  "this is the key",
  "this is the point",
  "what stands out",
  "god is showing me",
  "i feel convicted",
  "i need to change",
  "this hit me",
  "this really hit me",
  "this stands out",
  "the main thing",
  "the big thing",
];

function detectImportance(text: string) {
  const lower = text.toLowerCase();
  return importancePhrases.filter((phrase) => lower.includes(phrase));
}

function getSegmentSignalScore(segment: TranscriptSegment) {
  const importanceCount = detectImportance(segment.text).length;

  return (
    Number(segment.isAha) * 100 +
    importanceCount * 50 +
    (segment.excitement ?? 0) * 20 +
    Math.min(segment.text.length / 80, 10)
  );
}

function buildSessionInsight({
  topInsight,
  ahaSegments,
  importantSegments,
}: {
  topInsight?: TranscriptSegment;
  ahaSegments: TranscriptSegment[];
  importantSegments: { segment: TranscriptSegment; reasons: string[] }[];
}) {
  if (!topInsight && ahaSegments.length === 0 && importantSegments.length === 0) {
    return null;
  }

  const strongest = topInsight ?? importantSegments[0]?.segment ?? ahaSegments[0];
  if (!strongest) return null;

  const reasons: string[] = [];

  if (strongest.isAha) reasons.push("an aha moment");
  if (detectImportance(strongest.text).length > 0) {
    reasons.push("explicit importance language");
  }
  if ((strongest.excitement ?? 0) > 0.5) {
    reasons.push("strong vocal excitement");
  }

  return {
    quote: strongest.text,
    time: strongest.startedAt,
    excitement: strongest.excitement ?? 0,
    reasons,
    summary:
      reasons.length > 0
        ? `Logia flagged this as a high-signal moment because it included ${reasons.join(
            ", ",
          )}.`
        : "Logia flagged this as one of the strongest reflection moments in the session.",
  };
}
function splitIntoQuoteChunks(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 20);
}

function middleBoost(startedAt: number, durationMs: number) {
  if (!durationMs) return 1;

  const position = startedAt / durationMs;

  // Penalize the very beginning because excitement can spike from setup noise.
  if (position < 0.08) return 0.55;

  // Favor middle portion.
  if (position > 0.25 && position < 0.8) return 1.25;

  return 1;
}

function quoteScore(segment: TranscriptSegment, quote: string, durationMs: number) {
  const importance = detectImportance(quote).length;
  const excitement = segment.excitement ?? 0;
  const aha = segment.isAha ? 1 : 0;

  return (
    excitement * 60 +
    importance * 35 +
    aha * 40 +
    middleBoost(segment.startedAt, durationMs) * 20
  );
}
export default function SessionReview() {
  const [, params] = useRoute("/session/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const id = params?.id ?? "";
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const session = useGetSession(id, {
    query: { queryKey: getGetSessionQueryKey(id), enabled: !!id },
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

  function jumpToSegment(id: string) {
    const el = segmentRefs.current[id];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "ring-offset-2");

    window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "ring-offset-2");
    }, 1600);
  }

  const update = useUpdateSession();
  const remove = useDeleteSession({
    mutation: {
      onSuccess: () => {
        toast({ title: "Session deleted" });
        setLocation("/sessions");
      },
    },
  });

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const segments = session.data?.segments ?? [];


  const ahaSegments = useMemo(
    () => segments.filter((s) => s.isAha),
    [segments],
  );

  const theologyNotes = useMemo(() => {
    return findTheologyNotes({
      text: segments.map((s) => s.text).join(" "),
      currentBook: session.data?.book,
      currentChapter: session.data?.chapter,
    });
  }, [segments, session.data?.book, session.data?.chapter]);

  const wordStudies = useMemo(() => {
    return findWordStudies(
      segments.map((s) => s.text).join(" "),
    );
  }, [segments]);

  const greekLexicalCards = useMemo(() => {
    return findGreekLexicalCards(
      segments.map((s) => s.text).join(" "),
    );
  }, [segments]);

  const greekStudyNotes = useMemo(() => {
    return findGreekStudyNotes(
      greekLexicalCards.map((card) => card.id),
    );
  }, [greekLexicalCards]);

  const quoteAnchors = useMemo(() => {
    return generateQuoteAnchors({
      segments,
      currentBook: session.data?.book ?? "",
      currentChapter: session.data?.chapter ?? 0,
      commentaryWindow: 3,
    });
  }, [segments, session.data?.book, session.data?.chapter]);
  const reflectionSegments = useMemo(
    () => segments.filter((s) => s.kind === "reflection"),
    [segments],
  );

  const readingSegments = useMemo(
    () => segments.filter((s) => s.kind === "reading"),
    [segments],
  );



  const importantSegments = useMemo(() => {
    return segments
      .map((segment) => ({
        segment,
        reasons: detectImportance(segment.text),
      }))
      .filter((item) => item.reasons.length > 0);
  }, [segments]);

  const topInsightSegments = useMemo(() => {
    return [...reflectionSegments]
      .filter((s) => s.text.trim().length > 20)
      .sort((a, b) => getSegmentSignalScore(b) - getSegmentSignalScore(a))
      .slice(0, 3);
  }, [reflectionSegments]);


  const sessionInsight = useMemo(
    () =>
      buildSessionInsight({
        topInsight: topInsightSegments[0],
        ahaSegments,
        importantSegments,
      }),
    [topInsightSegments, ahaSegments, importantSegments],
  );

  const derivedWordCount = useMemo(() => {
    return segments.reduce((total, segment) => {
      return (
        total +
        segment.text
          .trim()
          .split(/\s+/)
          .filter(Boolean).length
      );
    }, 0);
  }, [segments]);

  

  const excitementSeries = useMemo(() => {
    if (segments.length === 0) {
      return [] as {
        id: string;
        text: string;
        x: number;
        y: number;
        kind: TranscriptSegment["kind"];
        isAha: boolean;
      }[];
    }

    return segments.map((s) => ({
      id: s.id,
      text: s.text,
     x: (s.startedAt + (s.endedAt - s.startedAt) / 2) / 1000,
      y: s.excitement ?? 0,
      kind: s.kind,
      isAha: s.isAha,
    }));
  }, [segments]);

const sessionDurationMs = session.data?.durationMs ?? 0;

const highEnergyQuotes = useMemo(() => {
  return reflectionSegments
    .flatMap((segment) =>
      splitIntoQuoteChunks(segment.text).map((quote) => ({
        id: `${segment.id}-${quote.slice(0, 12)}`,
        quote,
        segment,
        score: quoteScore(segment, quote, sessionDurationMs),
        reasons: detectImportance(quote),
      })),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  }, [reflectionSegments, sessionDurationMs]);

  const sermonFlow = useMemo(() => {
    return generateSermonFlow({
      verses: passage.data?.verses ?? [],
      segments,
      highEnergyQuotes,
    });
  }, [passage.data?.verses, segments, highEnergyQuotes]);

  

  if (session.isLoading) {
    return (
      <div className="px-6 md:px-12 py-10 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-32 w-full mb-3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session.data) {
    return (
      <div className="px-6 py-10 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Session not found.</p>
        <Link href="/sessions">
          <Button variant="ghost" className="mt-3">
            Back to sessions
          </Button>
        </Link>
      </div>
    );
  }

  const s = session.data;
  const startDate = new Date(s.startedAt);
  const displayedWordCount = Math.max(s.wordCount ?? 0, derivedWordCount);

  
  function saveTitle() {
    const trimmed = titleDraft.trim();

    update.mutate(
      { id: s.id, data: { title: trimmed } },
      {
        onSuccess: () => {
          setEditingTitle(false);
          toast({ title: "Title updated" });
        },
        onError: () =>
          toast({ title: "Couldn't save title", variant: "destructive" }),
      },
    );
  }

  return (
    <div className="px-6 md:px-12 py-10 max-w-5xl mx-auto">
      <Link href="/sessions" data-testid="link-back-sessions">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-3">
          <ArrowLeft className="h-4 w-4" /> All sessions
        </Button>
      </Link>

      <PageHeader
        eyebrow={startDate.toLocaleString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
        title={
          <span className="flex items-center gap-3 flex-wrap">
            <span data-testid="text-passage-title">
              {s.book} <span className="text-primary">{s.chapter}</span>
            </span>

            {editingTitle ? (
              <span className="flex items-center gap-2">
                <Input
                  data-testid="input-edit-title"
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  placeholder="Add a title…"
                  className="font-serif text-2xl h-10 w-72"
                />
                <Button size="sm" onClick={saveTitle} disabled={update.isPending}>
                  <Check className="h-4 w-4" />
                </Button>
              </span>
            ) : (
              <button
                data-testid="button-edit-title"
                onClick={() => {
                  setTitleDraft(s.title ?? "");
                  setEditingTitle(true);
                }}
                className="text-2xl md:text-3xl font-serif italic text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              >
                {s.title || "Add a title"}
                <Pencil className="h-3.5 w-3.5 opacity-60" />
              </button>
            )}
          </span>
        }
        actions={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-delete-session"
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the transcript, voice analysis, and
                  any aha moments for {s.book} {s.chapter}. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  data-testid="button-confirm-delete"
                  onClick={() => remove.mutate({ id: s.id })}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatTile
          label="Duration"
          value={formatDuration(s.durationMs)}
          icon={Hourglass}
          accent="muted"
          hint={`${formatDuration(s.readingMs)} reading · ${formatDuration(
            s.reflectionMs,
          )} reflecting`}
        />
        <StatTile
          label="Avg excitement"
          value={formatExcitement(s.averageExcitement)}
          icon={Activity}
          hint={`peak ${formatExcitement(s.peakExcitement)}`}
        />
        <StatTile
          label="Aha moments"
          value={s.ahaCount}
          icon={Sparkles}
          accent="accent"
          hint={s.ahaCount === 1 ? "captured insight" : "captured insights"}
        />
        <StatTile
          label="Words spoken"
          value={displayedWordCount.toLocaleString()}
          icon={BookOpen}
          accent="muted"
        />
      </div>

      {sessionInsight && (
        <Card className="paper mb-8 border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-xl">Session Insight</h2>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              Strongest moment around {formatClock(sessionInsight.time)} ·
              excitement {formatExcitement(sessionInsight.excitement)}
            </p>

            <p className="font-serif italic text-xl leading-relaxed">
              <Quote className="h-4 w-4 inline -mt-2 mr-1 text-primary/60" />
              {sessionInsight.quote}
            </p>

            <p className="mt-4 text-foreground/80 leading-relaxed">
              {sessionInsight.summary}
            </p>

            {sessionInsight.reasons.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {sessionInsight.reasons.map((reason) => (
                  <Badge key={reason} variant="secondary">
                    {reason}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="paper">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
              <Volume2 className="h-3.5 w-3.5" />
              Reading segments
            </div>
            <div className="font-serif text-3xl">{readingSegments.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Scripture reading portions captured.
            </p>
          </CardContent>
        </Card>

        <Card className="paper">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
              <Notebook className="h-3.5 w-3.5 text-primary" />
              Reflections
            </div>
            <div className="font-serif text-3xl">{reflectionSegments.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Personal thoughts and responses captured.
            </p>
          </CardContent>
        </Card>

        <Card className="paper">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Insight candidates
            </div>
            <div className="font-serif text-3xl">
              {topInsightSegments.length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Aha + importance + vocal signal.
            </p>
          </CardContent>
        </Card>
      </div>

      {topInsightSegments.length > 0 && (
        <section className="mb-10" data-testid="section-insights">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
            <Notebook className="h-5 w-5 text-primary" />
            Key reflections
          </h2>

          <div className="grid gap-3">
            {topInsightSegments.map((seg, index) => {
              const reasons = detectImportance(seg.text);

              return (
                <Card
                  key={seg.id}
                  className="paper border-l-4 border-l-primary"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Reflection {index + 1} · {formatClock(seg.startedAt)}
                      </div>
                      <Badge variant="secondary">
                        {formatExcitement(seg.excitement ?? 0)}
                      </Badge>
                    </div>

                    <p className="font-serif italic text-lg leading-relaxed">
                      {seg.text}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {seg.isAha && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20"
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          aha: {seg.ahaPhrase}
                        </Badge>
                      )}

                      {reasons.map((reason) => (
                        <Badge key={reason} variant="secondary">
                          “{reason}”
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {importantSegments.length > 0 && (
        <section className="mb-10" data-testid="section-important-language">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Explicit importance markers
          </h2>

          <div className="grid gap-3">
            {importantSegments.map(({ segment, reasons }) => (
              <Card
                key={segment.id}
                className="paper border-l-4 border-l-primary"
              >
                <CardContent className="p-5">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {reasons.map((reason) => (
                      <Badge key={reason} variant="secondary">
                        “{reason}”
                      </Badge>
                    ))}
                  </div>

                  <p className="font-serif text-lg leading-relaxed">
                    {segment.text}
                  </p>

                  <div className="mt-3 text-xs text-muted-foreground">
                    {segment.kind === "reflection" ? "Reflection" : "Reading"} ·{" "}
                    {formatClock(segment.startedAt)} · excitement{" "}
                    {formatExcitement(segment.excitement ?? 0)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {highEnergyQuotes.length > 0 && (
        <section className="mb-10" data-testid="section-high-energy-quotes">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            High-energy quotes
          </h2>


   

          <div className="grid gap-3">
            {highEnergyQuotes.map(({ id, quote, segment, reasons }) => (
              <Card key={id} className="paper border-l-4 border-l-primary">
                <CardContent className="p-5">
                  <div className="text-xs text-muted-foreground mb-2">
                    {formatClock(segment.startedAt)} · excitement{" "}
                    {formatExcitement(segment.excitement ?? 0)}
                  </div>

                  <p className="font-serif italic text-xl leading-relaxed">
                    <Quote className="h-4 w-4 inline -mt-2 mr-1 text-primary/60" />
                    {quote}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {segment.isAha && (
                      <Badge variant="secondary">aha moment</Badge>
                    )}

                    {reasons.map((reason) => (
                      <Badge key={reason} variant="secondary">
                        “{reason}”
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
      {wordStudies.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-2xl mb-4">
            Original Language Insights
          </h2>

          <div className="grid gap-4">
            {wordStudies.map((study) => (
              <Card key={study.id} className="paper">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{study.language}</Badge>

                    <div className="font-mono text-sm text-primary">
                      {study.strong}
                    </div>
                  </div>

                  <div className="font-serif text-2xl">
                    {study.lemma}
                  </div>

                  <div className="italic text-muted-foreground mb-3">
                    {study.transliteration}
                  </div>

                  <p className="mb-3">
                    {study.meaning}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {study.glosses.map((g) => (
                      <Badge key={g} variant="secondary">
                        {g}
                      </Badge>
                    ))}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Appears in: {study.relatedVerses.join(", ")}
                  </div>

                  <div className="mt-4 border-t pt-3 text-sm italic text-muted-foreground">
                    {study.aiInsightPlaceholder}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {greekLexicalCards.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-2xl mb-4">
            Greek Word Connections
          </h2>

          <div className="grid gap-4">
            {greekLexicalCards.map((card) => (
              <Card key={card.id} className="paper">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>greek</Badge>

                    {card.strong && (
                      <div className="font-mono text-sm text-primary">
                        {card.strong}
                      </div>
                    )}
                  </div>

                  <div className="font-serif text-2xl">
                    {card.lemma}
                  </div>

                  <div className="italic text-muted-foreground mb-3">
                    {card.transliteration}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {card.glosses.map((g) => (
                      <Badge key={g} variant="secondary">
                        {g}
                      </Badge>
                    ))}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Appears in: {card.occurrences.join(", ")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {greekStudyNotes.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-2xl mb-4">
            Greek Study Notes
          </h2>

          <div className="grid gap-4">
            {greekStudyNotes.map((note) => (
              <Card key={note.id} className="paper border-l-4 border-l-primary">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">
                      {note.status}
                    </Badge>
                  </div>

                  <div className="font-serif text-2xl mb-2">
                    {note.title}
                  </div>

                  <p className="leading-relaxed mb-4">
                    {note.explanation}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {note.relatedWords.map((word) => (
                      <Badge key={word} variant="secondary">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {theologyNotes.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-2xl mb-4">
            Verified Study Notes
          </h2>

          <div className="grid gap-4">
            {theologyNotes.map((note) => (
              <Card key={note.id} className="paper">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>
                      {note.language ?? "study"}
                    </Badge>

                    <Badge variant="secondary">
                      {note.status}
                    </Badge>
                  </div>

                  <div className="font-serif text-2xl mb-2">
                    {note.title}
                  </div>

                  <p className="leading-relaxed mb-4">
                    {note.claim}
                  </p>

                  <div className="text-sm text-muted-foreground mb-3">
                    Passages: {note.passageRefs.join(", ")}
                  </div>

                  {note.evidenceRefs && (
                    <div className="text-sm text-muted-foreground mb-3">
                      Evidence references:{" "}
                      {note.evidenceRefs.join(", ")}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {note.keywords.map((k) => (
                      <Badge key={k} variant="secondary">
                        {k}
                      </Badge>
                    ))}
                  </div>

                  <div className="border-t pt-3 text-sm text-muted-foreground">
                    Source: {note.sourceName}
                  </div>

                  <a
                    href={note.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline"
                  >
                    Open source article
                  </a>

                  {note.reviewerNotes && (
                    <div className="mt-4 border-t pt-3 text-sm italic text-muted-foreground">
                      Reviewer note: {note.reviewerNotes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {quoteAnchors.length > 0 && (
        <section className="mb-10" data-testid="section-quote-anchors">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
            <Quote className="h-5 w-5 text-primary" />
            Quoted Text Anchors
          </h2>

          <div className="grid gap-4">
            {quoteAnchors.map((anchor) => (
              <Card key={anchor.id} className="paper border-l-4 border-l-primary">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[11px] uppercase tracking-wider text-primary">
                      {anchor.referenceLabel}
                    </div>

                    <Badge variant={anchor.relation === "offshoot" ? "secondary" : "default"}>
                      {anchor.relation === "offshoot" ? "Offshoot" : "Mainline"}
                    </Badge>
                  </div>

                  {anchor.quoteText && (
                    <p className="font-serif italic text-lg leading-relaxed mb-3">
                      “{anchor.quoteText}”
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground mb-4">
                    Detected from: “{anchor.anchorText}”
                  </p>

                  {anchor.connectionIdea && (
                    <p className="text-sm mb-4">
                      <span className="text-muted-foreground">Connection idea: </span>
                      <span className="font-serif italic">“{anchor.connectionIdea}”</span>
                    </p>
                  )}

                  {anchor.commentarySegments.length > 0 && (
                    <div className="border-l border-border pl-4 space-y-3">
                      {anchor.commentarySegments.map((seg) => (
                        <button
                          key={seg.id}
                          onClick={() => jumpToSegment(seg.id)}
                          className="block w-full text-left rounded-md bg-muted/30 hover:bg-muted px-3 py-2 transition-colors"
                        >
                          <div className="text-xs text-muted-foreground mb-1">
                            Commentary · {formatClock(seg.startedAt)} ·{" "}
                            {formatExcitement(seg.excitement ?? 0)}
                          </div>
                          <p className="font-serif italic text-sm leading-relaxed">
                            {seg.text}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {sermonFlow.length > 0 && (
        <section className="mb-10" data-testid="section-sermon-flow">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Verse-by-Verse Flow
          </h2>

          <div className="space-y-4">
            {sermonFlow.map((node, index) => (
              <div key={node.id} className="relative pl-8">
                {index < sermonFlow.length - 1 && (
                  <div className="absolute left-3 top-8 bottom-[-1rem] w-px bg-border" />
                )}

                <div className="absolute left-0 top-2 h-6 w-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs text-primary font-medium">
                  {node.verse}
                </div>

                <Card className="paper">
                  <CardContent className="p-5">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                      {node.verseRange}
                    </div>

                    <p className="font-serif text-lg leading-relaxed">
                      {node.mainIdea}
                    </p>

                    <p className="text-sm text-muted-foreground mt-2">
                      “{node.sourceQuote}”
                    </p>

                    {node.branches.length > 0 && (
                      <div className="mt-4 ml-2 border-l border-border pl-4 space-y-3">
                        {node.branches.map((branch) => (
                          <button
                            key={branch.id}
                            onClick={() => {
                              if (branch.segmentId) jumpToSegment(branch.segmentId);
                            }}
                            className="block w-full text-left rounded-md bg-muted/30 hover:bg-muted px-3 py-2 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <Badge variant="secondary">{branch.label}</Badge>
                              {branch.excitement !== undefined && (
                                <span className="text-xs text-primary">
                                  {formatExcitement(branch.excitement)}
                                </span>
                              )}
                            </div>

                            <p className="font-serif italic text-sm leading-relaxed line-clamp-3">
                              {branch.text}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>
      )}

      <Card className="paper mb-8" data-testid="card-excitement-timeline">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg">Excitement timeline</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                Reading
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Reflecting
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                Aha
              </span>
            </div>
          </div>
          <Timeline
            data={excitementSeries}
            totalMs={(s.durationMs || 1) / 1000}
            onJumpToSegment={jumpToSegment}
            />
        </CardContent>
      </Card>

      {ahaSegments.length > 0 && (
        <section className="mb-10" data-testid="section-aha-moments">
          <h2 className="font-serif text-2xl mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Aha moments
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            {ahaSegments.map((seg) => (
              <Card key={seg.id} className="paper">
                <CardContent className="p-5">
                  <div className="text-[11px] uppercase tracking-wider text-primary mb-1">
                    {seg.ahaPhrase}
                  </div>

                  <p className="font-serif italic text-lg leading-snug">
                    <Quote className="h-3 w-3 inline -mt-2 mr-1 text-primary/60" />
                    {seg.text}
                  </p>

                  <div className="text-xs text-muted-foreground mt-3 flex justify-between">
                    <span>{formatClock(seg.startedAt)}</span>
                    <span>
                      excitement {formatExcitement(seg.excitement ?? 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section data-testid="section-transcript">
        <h2 className="font-serif text-2xl mb-4">Transcript</h2>

        {segments.length === 0 ? (
          <p className="text-muted-foreground italic">
            No segments were captured for this session.
          </p>
        ) : (
          <div className="space-y-4">
            {segments.map((seg) => (
              <div
                key={seg.id}
                ref={(el) => {
                  segmentRefs.current[seg.id] = el;
                }}
              >
                <SegmentCard segment={seg} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SegmentCard({ segment }: { segment: TranscriptSegment }) {
  const isReflection = segment.kind === "reflection";
  const importanceReasons = detectImportance(segment.text);

  return (
    <Card
      data-testid={`segment-${segment.id}`}
      className={cn(
        "paper border-l-4",
        isReflection ? "border-l-primary" : "border-l-muted-foreground/30",
        segment.isAha && "ring-1 ring-primary/30",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            {isReflection ? (
              <>
                <Notebook className="h-3.5 w-3.5 text-primary" /> Reflection
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5" /> Reading
              </>
            )}

            <span>
              · {formatClock(segment.startedAt)} –{" "}
              {formatClock(segment.endedAt)}
            </span>

            {segment.isAha && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 gap-1 h-5"
              >
                <Sparkles className="h-2.5 w-2.5" /> aha
              </Badge>
            )}

            {importanceReasons.length > 0 && (
              <Badge variant="secondary" className="h-5">
                important
              </Badge>
            )}
          </div>

          <span className="tabular-nums">
            {formatExcitement(segment.excitement ?? 0)}
          </span>
        </div>

        <p
          className={cn(
            "font-serif text-lg leading-relaxed",
            isReflection && "italic text-foreground/95",
          )}
        >
          {segment.text}
        </p>

        {importanceReasons.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {importanceReasons.map((reason) => (
              <Badge key={reason} variant="secondary">
                “{reason}”
              </Badge>
            ))}
          </div>
        )}

        {(segment.f0Mean ?? null) !== null && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
            <Stat label="F₀ mean" value={`${segment.f0Mean!.toFixed(1)} Hz`} />
            <Stat label="F₀ σ" value={`${(segment.f0Std ?? 0).toFixed(1)} Hz`} />
            <Stat label="Jitter" value={(segment.jitter ?? 0).toFixed(4)} />
            <Stat label="HNR" value={`${(segment.hnr ?? 0).toFixed(1)} dB`} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded px-2 py-1">
      <div className="uppercase tracking-wider text-[10px]">{label}</div>
      <div className="font-mono text-[12px] text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Timeline({
  data,
  totalMs,
  onJumpToSegment,
}: {
  data: {
    id: string;
    text: string;
    x: number;
    y: number;
    kind: TranscriptSegment["kind"];
    isAha: boolean;
  }[];
  totalMs: number;
  onJumpToSegment: (id: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground italic">
        No timeline data yet.
      </div>
    );
  }

  const W = 760;
  const H = 180;
  const pad = 24;
  const innerW = W - pad * 2;
  const innerH = H - pad * 2;

  const maxPoint = data.reduce((best, point) =>
    point.y > best.y ? point : best,
  );

  const xFor = (t: number) => pad + (t / totalMs) * innerW;
  const yFor = (v: number) => pad + (1 - v) * innerH;

  const points = data.map((d) => ({
    x: xFor(d.x),
    y: yFor(d.y),
  }));

  const path = points.reduce((acc, point, i, arr) => {
    if (i === 0) {
      return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }

    const prev = arr[i - 1];

    const midX = ((prev.x + point.x) / 2).toFixed(1);
    const midY = ((prev.y + point.y) / 2).toFixed(1);

    return `${acc} Q ${prev.x.toFixed(1)} ${prev.y.toFixed(
      1,
    )} ${midX} ${midY}`;
  }, "");

  function intensityColor(y: number) {
    if (y >= 0.75) return "hsl(var(--primary))";
    if (y >= 0.5) return "hsl(var(--primary) / 0.75)";
    if (y >= 0.25) return "hsl(var(--muted-foreground))";
    return "hsl(var(--border))";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          Low
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
          Medium
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          High / peak
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" />
          Aha
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" role="img">
          <defs>
            <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="timelineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--muted-foreground))" />
              <stop offset="35%" stopColor="hsl(var(--primary) / 0.55)" />
              <stop offset="70%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary))" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((g) => (
            <line
              key={g}
              x1={pad}
              y1={yFor(g)}
              x2={W - pad}
              y2={yFor(g)}
              stroke="hsl(var(--border))"
              strokeDasharray="2 4"
            />
          ))}

          <path
            d={`${path} L ${xFor(data[data.length - 1]!.x)} ${H - pad} L ${xFor(
              data[0]!.x,
            )} ${H - pad} Z`}
            fill="url(#timelineFill)"
          />

          <path
            d={path}
            fill="none"
            stroke="url(#timelineStroke)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {data.map((d) => {
            const isPeak = d.id === maxPoint.id;
            const r = isPeak ? 10 : d.isAha ? 7 : d.y >= 0.65 ? 5.5 : 3;

            return (
              <g
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => onJumpToSegment(d.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onJumpToSegment(d.id);
                  }
                }}
                className="cursor-pointer"
              >


                 {isPeak && (
                  <circle
                    cx={xFor(d.x)}
                    cy={yFor(d.y)}
                    r={22}
                    fill="hsl(var(--primary))"
                    opacity="0.12"
                  />
                )}


                {isPeak && (
                  <circle
                    cx={xFor(d.x)}
                    cy={yFor(d.y)}
                    r={15}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeOpacity="0.45"
                    strokeWidth="2"
                  />
                )}

               
                <circle
                  cx={xFor(d.x)}
                  cy={yFor(d.y)}
                  r={r}
                  fill={intensityColor(d.y)}
                  opacity={d.kind === "reading" ? 0.65 : 1}
                />

                <title>
                  {`${isPeak ? "Peak intensity · " : ""}${formatClock(d.x)} · ${formatExcitement(
                    d.y,
                  )} · ${d.text.slice(0, 90)}`}
                </title>
              </g>
            );
          })}

          <text
            x={xFor(maxPoint.x)}
            y={Math.max(14, yFor(maxPoint.y) - 18)}
            textAnchor="middle"
            fontSize="11"
            fill="hsl(var(--primary))"
          >
            Peak
          </text>
        </svg>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {[...data]
          .sort((a, b) => b.y - a.y)
          .slice(0, 3)
          .map((point, index) => (
            <button
              key={point.id}
              onClick={() => onJumpToSegment(point.id)}
              className="text-left rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted transition-colors"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Intensity pocket {index + 1} · {formatClock(point.x)}
              </div>
              <div className="font-serif text-sm line-clamp-2 mt-1">
                {point.text}
              </div>
              <div className="text-xs text-primary mt-2">
                {formatExcitement(point.y)}
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}