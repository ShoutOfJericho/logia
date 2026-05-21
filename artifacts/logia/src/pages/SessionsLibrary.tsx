import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, BookOpen, Sparkles, Mic } from "lucide-react";
import { useListSessions } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { formatDuration, formatExcitement, formatRelativeDate } from "@/lib/format";

export default function SessionsLibrary() {
  const { data, isLoading } = useListSessions({ limit: 200 });
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const items = data ?? [];
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (s) =>
        s.book.toLowerCase().includes(q) ||
        `${s.book} ${s.chapter}`.toLowerCase().includes(q) ||
        (s.title?.toLowerCase().includes(q) ?? false),
    );
  }, [data, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const s of filtered) {
      const date = new Date(s.startedAt);
      const key = date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="px-6 md:px-12 py-10 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Library"
        title="All sessions"
        description="Every reading and reflection you've recorded. Click a session to revisit the transcript and timeline."
        actions={
          <Link href="/session/new" data-testid="link-new-session-library">
            <Button className="gap-2">
              <Mic className="h-4 w-4" /> New session
            </Button>
          </Link>
        }
      />

      <div className="relative mb-6">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid="input-search-sessions"
          placeholder="Filter by book, chapter, or title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 max-w-md font-serif bg-background"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyLibrary query={query} />
      ) : (
        <div className="space-y-8">
          {grouped.map(([month, items]) => (
            <section key={month}>
              <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
                {month}
              </h2>
              <div className="space-y-2">
                {items.map((s) => (
                  <Link
                    key={s.id}
                    href={`/session/${s.id}`}
                    data-testid={`link-session-${s.id}`}
                  >
                    <Card className="paper hover-elevate cursor-pointer transition-colors">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-serif text-xl text-foreground truncate">
                            {s.book} {s.chapter}
                            {s.title && (
                              <span className="text-muted-foreground italic font-normal text-base ml-2">
                                · {s.title}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                            <span>{formatRelativeDate(s.startedAt)}</span>
                            <span>·</span>
                            <span>{formatDuration(s.durationMs)}</span>
                            <span>·</span>
                            <span>{s.wordCount.toLocaleString()} words</span>
                            {s.ahaCount > 0 && (
                              <Badge
                                variant="secondary"
                                className="bg-primary/10 text-primary border-primary/20 gap-1 h-5"
                              >
                                <Sparkles className="h-3 w-3" />
                                {s.ahaCount} aha
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Excitement
                          </div>
                          <div className="font-serif text-2xl text-primary tabular-nums">
                            {formatExcitement(s.averageExcitement)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyLibrary({ query }: { query: string }) {
  if (query) {
    return (
      <div className="text-center py-16">
        <p className="font-serif text-lg">No sessions match "{query}"</p>
      </div>
    );
  }
  return (
    <div className="text-center py-16">
      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
      <p className="font-serif text-xl">Your library is waiting</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
        Each session you record will be stored here for you to revisit.
      </p>
      <Link href="/session/new">
        <Button className="mt-5 gap-2">
          <Mic className="h-4 w-4" /> Begin a session
        </Button>
      </Link>
    </div>
  );
}
