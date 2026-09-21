import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Database,
  ExternalLink,
  FileJson,
  Languages,
  ShieldAlert,
  Star,
} from "lucide-react";
import {
  getListStudyNotesQueryKey,
  useImportStudyNotes,
  useListStudyNotes,
  useUpdateStudyNote,
  type CreateStudyNoteInput,
  type StudyNote,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { useToast } from "@/hooks/use-toast";

const sampleImport = JSON.stringify(
  {
    notes: [
      {
        id: "candidate-example",
        topic: "example word",
        language: "hebrew",
        title: "Example candidate note",
        claim: "State the lexical or canonical connection in one sentence.",
        summary: "Write an original compact summary. Do not paste article text.",
        readerValue: "Explain why this helps a reader understand the passage.",
        sourceName: "Source name",
        sourceUrl: "https://example.com/source",
        triggerPassages: ["Genesis 1"],
        triggerBooks: ["Genesis"],
        triggerKeywords: ["example"],
        passageRefs: ["Genesis 1:1"],
        keywords: ["example", "candidate"],
        evidenceRefs: ["Genesis 1:1"],
        status: "needs-review",
        reviewerNotes: "Imported as a candidate for review.",
      },
    ],
  },
  null,
  2,
);

function countBy<T extends string>(values: T[]) {
  return values.reduce<Record<T, number>>(
    (acc, value) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }),
    {} as Record<T, number>,
  );
}

function noteScore(note: StudyNote) {
  if (note.ratingCount === 0) return -1;
  return note.averageRating;
}

export default function StudyNotesAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const notes = useListStudyNotes();
  const update = useUpdateStudyNote();
  const importer = useImportStudyNotes();
  const [importText, setImportText] = useState(sampleImport);

  const allNotes = notes.data ?? [];

  const languageCounts = useMemo(
    () => countBy(allNotes.map((note) => note.language)),
    [allNotes],
  );

  const booksCovered = useMemo(() => {
    const books = new Set<string>();
    allNotes.forEach((note) => note.triggerBooks.forEach((book) => books.add(book)));
    return books.size;
  }, [allNotes]);

  const needsReview = useMemo(
    () =>
      allNotes
        .filter((note) => note.status === "needs-review")
        .sort((a, b) => noteScore(a) - noteScore(b)),
    [allNotes],
  );

  const lowRated = useMemo(
    () =>
      allNotes
        .filter((note) => note.ratingCount >= 2 && note.averageRating < 3.5)
        .sort((a, b) => a.averageRating - b.averageRating),
    [allNotes],
  );

  const topRated = useMemo(
    () =>
      allNotes
        .filter((note) => note.ratingCount > 0)
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 6),
    [allNotes],
  );

  function refreshNotes() {
    queryClient.invalidateQueries({ queryKey: getListStudyNotesQueryKey() });
  }

  function updateStatus(note: StudyNote, status: StudyNote["status"]) {
    update.mutate(
      {
        id: note.id,
        data: {
          status,
          reviewerNotes:
            status === "approved"
              ? "Approved from the review dashboard."
              : "Marked for review from the review dashboard.",
        },
      },
      {
        onSuccess: () => {
          refreshNotes();
          toast({ title: "Study note updated" });
        },
        onError: () =>
          toast({ title: "Could not update study note", variant: "destructive" }),
      },
    );
  }

  function importNotes() {
    let parsed: { notes: CreateStudyNoteInput[] };

    try {
      parsed = JSON.parse(importText) as { notes: CreateStudyNoteInput[] };
    } catch {
      toast({ title: "Import JSON is invalid", variant: "destructive" });
      return;
    }

    importer.mutate(
      { data: parsed },
      {
        onSuccess: (result) => {
          refreshNotes();
          toast({ title: `Imported ${result.imported} study note(s)` });
        },
        onError: () =>
          toast({ title: "Could not import study notes", variant: "destructive" }),
      },
    );
  }

  return (
    <div className="px-6 md:px-12 py-10 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Study note operations"
        title="Original Language Library"
        description="Grow the Hebrew, Aramaic, and Greek study catalog, review weak candidates, and let saved ratings tell you what deserves promotion."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {notes.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-lg" />
          ))
        ) : (
          <>
            <StatTile label="Total studies" value={allNotes.length} icon={Database} />
            <StatTile
              label="Needs review"
              value={needsReview.length}
              icon={ShieldAlert}
              accent="accent"
            />
            <StatTile label="Books covered" value={booksCovered} icon={Languages} />
            <StatTile
              label="Rated studies"
              value={allNotes.filter((note) => note.ratingCount > 0).length}
              icon={Star}
              accent="accent"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <Card className="paper">
            <CardContent className="p-5">
              <h2 className="font-serif text-xl mb-3">Review Queue</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Start here. Low confidence, low rating, or speculative items should be refined
                before they become approved studies.
              </p>

              <div className="grid gap-3">
                {(lowRated.length > 0 ? lowRated : needsReview.slice(0, 8)).map((note) => (
                  <StudyNoteReviewCard
                    key={note.id}
                    note={note}
                    onApprove={() => updateStatus(note, "approved")}
                    onReview={() => updateStatus(note, "needs-review")}
                    isUpdating={update.isPending}
                  />
                ))}

                {lowRated.length === 0 && needsReview.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    No review items right now. Imported candidates will appear here.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="paper">
            <CardContent className="p-5">
              <h2 className="font-serif text-xl mb-3">Bulk Import</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Paste candidate notes as JSON. Keep source text out of the database; store
                original summaries plus source links.
              </p>

              <Textarea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                className="font-mono text-xs min-h-[360px]"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={importNotes} disabled={importer.isPending} className="gap-2">
                  <FileJson className="h-4 w-4" />
                  Import candidates
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setImportText(sampleImport)}
                >
                  Reset sample
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <Card className="paper">
            <CardContent className="p-5">
              <h2 className="font-serif text-xl mb-3">Language Coverage</h2>
              <div className="space-y-3">
                {(["hebrew", "aramaic", "greek"] as const).map((language) => (
                  <div key={language} className="flex items-center justify-between">
                    <span className="capitalize text-sm">{language}</span>
                    <Badge variant="secondary">{languageCounts[language] ?? 0}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="paper">
            <CardContent className="p-5">
              <h2 className="font-serif text-xl mb-3">Top Rated</h2>
              <div className="space-y-3">
                {topRated.map((note) => (
                  <div key={note.id} className="border-b border-border last:border-0 pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-serif text-lg">{note.title}</div>
                      <Badge>{note.averageRating.toFixed(1)}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {note.language} · {note.ratingCount} rating
                      {note.ratingCount === 1 ? "" : "s"}
                    </div>
                  </div>
                ))}

                {topRated.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    Ratings will appear here as readers evaluate studies.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StudyNoteReviewCard({
  note,
  onApprove,
  onReview,
  isUpdating,
}: {
  note: StudyNote;
  onApprove: () => void;
  onReview: () => void;
  isUpdating: boolean;
}) {
  return (
    <Card className="border border-border bg-background/70">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge>{note.language}</Badge>
          <Badge variant={note.status === "approved" ? "default" : "secondary"}>
            {note.status}
          </Badge>
          <Badge variant="outline">
            {note.ratingCount > 0
              ? `${note.averageRating.toFixed(1)}/5 · ${note.ratingCount}`
              : "unrated"}
          </Badge>
        </div>

        <div className="font-serif text-xl mb-2">{note.title}</div>
        <p className="text-sm leading-relaxed mb-3">{note.summary}</p>

        <div className="text-xs text-muted-foreground mb-3">
          Passages: {note.passageRefs.join(", ")}
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between">
          <a
            href={note.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary underline"
          >
            {note.sourceName}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onReview} disabled={isUpdating}>
              Needs review
            </Button>
            <Button size="sm" onClick={onApprove} disabled={isUpdating} className="gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
