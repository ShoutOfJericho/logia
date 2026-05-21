import { Link } from "wouter";
import { Sparkles, Flame, Quote, BookOpen, Activity } from "lucide-react";
import {
  useGetDashboardSummary,
  useListAhaMoments,
  useListExcitedPassages,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { formatDuration, formatExcitement, formatRelativeDate } from "@/lib/format";

export default function Insights() {
  const summary = useGetDashboardSummary();
  const aha = useListAhaMoments({ limit: 25 });
  const excited = useListExcitedPassages();

  const reflectionRatio = (() => {
    const r = summary.data?.totalReadingMs ?? 0;
    const refl = summary.data?.totalReflectionMs ?? 0;
    const total = r + refl;
    if (!total) return 0;
    return refl / total;
  })();

  return (
    <div className="px-6 md:px-12 py-10 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Patterns over time"
        title="Insights"
        description="What is rising up in your reading? Where does your voice quicken? These are the verses you've leaned in to."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {summary.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-lg" />
          ))
        ) : (
          <>
            <StatTile
              label="Average excitement"
              value={formatExcitement(summary.data?.averageExcitement ?? 0)}
              icon={Activity}
              hint="across all reflections"
            />
            <StatTile
              label="Reflection ratio"
              value={`${Math.round(reflectionRatio * 100)}%`}
              icon={Sparkles}
              accent="accent"
              hint="of total time speaking"
            />
            <StatTile
              label="Books explored"
              value={summary.data?.uniqueBooks ?? 0}
              icon={BookOpen}
              hint={`${summary.data?.uniqueChapters ?? 0} unique chapters`}
            />
            <StatTile
              label="Streak"
              value={summary.data?.currentStreakDays ?? 0}
              icon={Flame}
              accent="accent"
              hint={summary.data?.currentStreakDays === 1 ? "day" : "days in a row"}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="paper lg:col-span-3" data-testid="card-aha-moments">
          <CardContent className="p-5">
            <h2 className="font-serif text-xl mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Aha moments
            </h2>
            {aha.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-md" />
                ))}
              </div>
            ) : aha.data?.length ? (
              <ul className="space-y-5">
                {aha.data.map((m) => (
                  <li key={m.id} className="border-l-2 border-primary/40 pl-4">
                    <Link
                      href={`/session/${m.sessionId}`}
                      data-testid={`link-insight-aha-${m.id}`}
                      className="block hover:text-foreground"
                    >
                      <div className="text-[10px] uppercase tracking-widest text-primary mb-1">
                        {m.phrase}
                      </div>
                      <p className="font-serif italic text-foreground/95 leading-snug">
                        <Quote className="h-3 w-3 inline -mt-2 mr-1 text-primary/60" />
                        {m.text}
                      </p>
                      <div className="text-xs text-muted-foreground mt-2 flex items-center gap-3">
                        <span>
                          {m.book} {m.chapter}
                        </span>
                        <span>·</span>
                        <span>{formatRelativeDate(m.sessionStartedAt)}</span>
                        <Badge variant="outline" className="ml-auto h-5">
                          excitement {formatExcitement(m.excitement)}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyAha />
            )}
          </CardContent>
        </Card>

        <Card className="paper lg:col-span-2" data-testid="card-excited-passages">
          <CardContent className="p-5">
            <h2 className="font-serif text-xl mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent" /> Where you came alive
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Passages where your voice consistently lifted.
            </p>
            {excited.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-md" />
                ))}
              </div>
            ) : excited.data?.length ? (
              <ol className="space-y-3">
                {excited.data.map((p, i) => (
                  <li
                    key={`${p.book}-${p.chapter}`}
                    className="flex items-center gap-3 border-b border-border last:border-0 pb-3"
                  >
                    <div className="font-serif text-2xl text-muted-foreground/50 tabular-nums w-7">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-lg text-foreground truncate">
                        {p.book} {p.chapter}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.sessionCount} session{p.sessionCount === 1 ? "" : "s"} · peak{" "}
                        {formatExcitement(p.peakExcitement)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-serif text-xl text-primary tabular-nums">
                        {formatExcitement(p.averageExcitement)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        avg
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Once you've recorded a few sessions, your most stirring passages will rise to
                the top here.
              </p>
            )}
            {summary.data && summary.data.totalReadingMs > 0 && (
              <p className="text-xs text-muted-foreground mt-5 italic font-serif">
                You've spent {formatDuration(summary.data.totalReadingMs)} reading aloud — the
                slow, deliberate kind that lets a verse breathe.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyAha() {
  return (
    <div className="text-center py-10">
      <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
      <p className="font-serif text-lg">No aha moments yet</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
        Try saying things like <em>"what's interesting is…"</em>,{" "}
        <em>"this is really crucial,"</em> or <em>"the lesson here…"</em> while reflecting.
      </p>
    </div>
  );
}
