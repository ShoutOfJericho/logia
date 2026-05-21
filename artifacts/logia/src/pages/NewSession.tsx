import { useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { useCreateSession } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { BIBLE_BOOKS, findBook, type BibleBook } from "@/lib/bibleBooks";
import { cn } from "@/lib/utils";

export default function NewSession() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [book, setBook] = useState<BibleBook | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [title, setTitle] = useState("");

  const create = useCreateSession({
    mutation: {
      onSuccess: (session) => {
        setLocation(`/session/${session.id}/live`);
      },
      onError: (e: unknown) => {
        const message = e instanceof Error ? e.message : "Could not start session";
        toast({ title: "Couldn't begin", description: message, variant: "destructive" });
      },
    },
  });

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return BIBLE_BOOKS;
    return BIBLE_BOOKS.filter((b) => b.name.toLowerCase().includes(q));
  }, [filter]);

  const grouped = useMemo(() => {
    return {
      OT: filtered.filter((b) => b.testament === "OT"),
      NT: filtered.filter((b) => b.testament === "NT"),
    };
  }, [filtered]);

  function handleStart() {
    if (!book || !chapter) return;
    create.mutate({
      data: {
        book: book.name,
        chapter,
        ...(title.trim() ? { title: title.trim() } : {}),
      },
    });
  }

  function handleQuickReference(value: string) {
    const m = value.match(/^([1-3]?\s?[A-Za-z]+(?:\s[A-Za-z]+)?)\s+(\d+)\s*$/);
    if (!m) return;
    const found = findBook(m[1]!.trim().replace(/\s+/g, " "));
    if (!found) return;
    const ch = parseInt(m[2]!, 10);
    if (ch < 1 || ch > found.chapters) return;
    setBook(found);
    setChapter(ch);
  }

  return (
    <div className="px-6 md:px-12 py-10 max-w-5xl mx-auto">
      <Link href="/" data-testid="link-back-home">
        <Button variant="ghost" size="sm" className="gap-2 mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Today
        </Button>
      </Link>

      <PageHeader
        eyebrow="New session"
        title="What will you read today?"
        description="Choose a passage. We'll listen as you read aloud and capture the thoughts you speak in response."
      />

      <Card className="paper mb-6">
        <CardContent className="p-5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Quick reference
          </label>
          <div className="relative mt-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-quick-reference"
              placeholder="Type a passage like “1 Samuel 16” and press Enter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickReference(filter);
              }}
              className="pl-9 font-serif text-base bg-background"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="paper lg:col-span-3">
          <CardContent className="p-5">
            <h2 className="font-serif text-lg mb-3">Books</h2>
            <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-2">
              {(["OT", "NT"] as const).map((t) =>
                grouped[t].length === 0 ? null : (
                  <div key={t}>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                      {t === "OT" ? "Old Testament" : "New Testament"}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {grouped[t].map((b) => (
                        <button
                          key={b.name}
                          data-testid={`button-book-${b.name.replace(/\s/g, "-").toLowerCase()}`}
                          onClick={() => {
                            setBook(b);
                            setChapter(null);
                          }}
                          className={cn(
                            "text-left px-3 py-2 rounded-md text-sm font-serif transition-colors hover-elevate border",
                            book?.name === b.name
                              ? "bg-primary text-primary-foreground border-primary-border"
                              : "bg-background border-transparent text-foreground",
                          )}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="paper lg:col-span-2">
          <CardContent className="p-5 space-y-5">
            <div>
              <h2 className="font-serif text-lg">Chapter</h2>
              {!book ? (
                <p className="text-sm text-muted-foreground italic mt-2">
                  Select a book to choose a chapter.
                </p>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 mt-3 max-h-48 overflow-y-auto pr-1">
                  {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      data-testid={`button-chapter-${n}`}
                      onClick={() => setChapter(n)}
                      className={cn(
                        "h-9 rounded-md text-sm tabular-nums hover-elevate border transition-colors",
                        chapter === n
                          ? "bg-primary text-primary-foreground border-primary-border"
                          : "bg-background border-border text-foreground",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Optional title
              </label>
              <Input
                data-testid="input-title"
                placeholder="e.g. Anointing of David"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 font-serif"
              />
            </div>

            <div className="border-t pt-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
                Selected
              </div>
              {book && chapter ? (
                <div className="font-serif text-2xl text-foreground" data-testid="text-selected-passage">
                  {book.name} {chapter}
                  <Badge variant="secondary" className="ml-2 align-middle">WEB</Badge>
                </div>
              ) : (
                <div className="font-serif text-lg text-muted-foreground italic">
                  No passage chosen yet
                </div>
              )}
            </div>

            <Button
              data-testid="button-begin-session"
              size="lg"
              className="w-full gap-2"
              disabled={!book || !chapter || create.isPending}
              onClick={handleStart}
            >
              {create.isPending ? "Starting…" : "Begin reading"}
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your microphone will turn on after you begin.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
