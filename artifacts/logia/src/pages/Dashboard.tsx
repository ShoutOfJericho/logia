import { Link } from "wouter";
import {
  Flame,
  BookOpen,
  Sparkles,
  Hourglass,
  Mic,
  ChevronRight,
  Quote,
} from "lucide-react";
import {
  useGetDashboardSummary,
  useListRecentSessions,
  useListAhaMoments,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { formatDuration, formatRelativeDate, formatExcitement } from "@/lib/format";

export default function Dashboard() {
  const summary = useGetDashboardSummary();
  const recent = useListRecentSessions();
  const aha = useListAhaMoments({ limit: 5 });

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 5) return "Late evening";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="px-6 md:px-12 py-10 max-w-6xl mx-auto">
      <PageHeader
        eyebrow={greeting}
        title={
          <>
            What is the Lord <em className="text-primary not-italic font-serif">stirring</em>{" "}
            in you today?
          </>
        }
        description="Open a passage, read it aloud, and let your reflections become a record of what you heard."
        actions={
          <Link href="/session/new" data-testid="link-start-session">
            <Button size="lg" className="gap-2">
              <Mic className="h-4 w-4" /> Begin a session
            </Button>
          </Link>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {summary.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-lg" />
          ))
        ) : (
          <>
            <StatTile
              testId="stat-streak"
              label="Reading streak"
              value={summary.data?.currentStreakDays ?? 0}
              hint={summary.data?.currentStreakDays === 1 ? "day" : "days in a row"}
              icon={Flame}
              accent="accent"
            />
            <StatTile
              testId="stat-sessions"
              label="Sessions"
              value={summary.data?.totalSessions ?? 0}
              hint={`across ${summary.data?.uniqueBooks ?? 0} books`}
              icon={BookOpen}
            />
            <StatTile
              testId="stat-aha"
              label="Aha moments"
              value={summary.data?.totalAhaMoments ?? 0}
              hint="captured insights"
              icon={Sparkles}
              accent="accent"
            />
            <StatTile
              testId="stat-time"
              label="Time in the Word"
              value={formatDuration(summary.data?.totalReadingMs ?? 0)}
              hint={`+ ${formatDuration(summary.data?.totalReflectionMs ?? 0)} reflecting`}
              icon={Hourglass}
              accent="muted"
            />
          </>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="paper lg:col-span-3" data-testid="card-recent-sessions">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="font-serif text-xl">Recent sessions</CardTitle>
            <Link href="/sessions" data-testid="link-all-sessions">
              <Button variant="ghost" size="sm" className="gap-1">
                All sessions <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {recent.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-md" />
                ))}
              </div>
            ) : recent.data?.length ? (
              <ul className="divide-y divide-border">
                {recent.data.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/session/${s.id}`}
                      data-testid={`link-recent-session-${s.id}`}
                      className="flex items-center justify-between py-3 hover-elevate rounded-md px-2 -mx-2"
                    >
                      <div className="min-w-0">
                        <div className="font-serif text-lg text-foreground truncate">
                          {s.book} {s.chapter}
                          {s.title && (
                            <span className="text-muted-foreground italic font-normal text-base ml-2">
                              · {s.title}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>{formatRelativeDate(s.startedAt)}</span>
                          <span>{formatDuration(s.durationMs)}</span>
                          {s.ahaCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary border-primary/20 gap-1 h-5"
                            >
                              <Sparkles className="h-3 w-3" />
                              {s.ahaCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          Excitement
                        </div>
                        <div className="font-serif text-2xl text-primary tabular-nums">
                          {formatExcitement(s.averageExcitement)}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyRecent />
            )}
          </CardContent>
        </Card>

        <Card className="paper lg:col-span-2" data-testid="card-recent-aha">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Recent aha moments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {aha.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-md" />
                ))}
              </div>
            ) : aha.data?.length ? (
              <ul className="space-y-4">
                {aha.data.map((m) => (
                  <li key={m.id} className="border-l-2 border-primary/40 pl-3">
                    <Link
                      href={`/session/${m.sessionId}`}
                      data-testid={`link-aha-${m.id}`}
                      className="block hover:text-foreground"
                    >
                      <Quote className="h-3 w-3 text-primary/60 inline -mt-2 mr-1" />
                      <span className="font-serif italic text-foreground/90 leading-snug">
                        {m.text}
                      </span>
                      <div className="text-[11px] text-muted-foreground mt-1.5 uppercase tracking-wider">
                        {m.book} {m.chapter} · {formatRelativeDate(m.sessionStartedAt)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Your aha moments will appear here as you reflect aloud.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyRecent() {
  return (
    <div className="text-center py-10">
      <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
      <p className="font-serif text-lg text-foreground">No sessions yet</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
        Begin your first reading to start capturing what you hear yourself think.
      </p>
      <Link href="/session/new" data-testid="link-empty-start">
        <Button className="mt-5 gap-2" size="sm">
          <Mic className="h-3.5 w-3.5" /> Begin a session
        </Button>
      </Link>
    </div>
  );
}
