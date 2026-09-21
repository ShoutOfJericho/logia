import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  ListStudyNotesQueryParams,
  ListStudyNotesResponse,
  ImportStudyNotesBody,
  ImportStudyNotesResponse,
  RateStudyNoteBody,
  RateStudyNoteParams,
  RateStudyNoteResponse,
  UpdateStudyNoteBody,
  UpdateStudyNoteParams,
  UpdateStudyNoteResponse,
} from "@workspace/api-zod";
import {
  db,
  studyNoteRatingsTable,
  studyNotesTable,
  type StudyNoteRow,
} from "@workspace/db";
import { STUDY_NOTE_SEED } from "../data/studyNotes";

const router: IRouter = Router();

let seedAttempted = false;

async function ensureSeeded() {
  if (seedAttempted) return;
  seedAttempted = true;

  await db
    .insert(studyNotesTable)
    .values(STUDY_NOTE_SEED)
    .onConflictDoUpdate({
      target: studyNotesTable.id,
      set: {
        topic: sql`excluded.topic`,
        language: sql`excluded.language`,
        title: sql`excluded.title`,
        claim: sql`excluded.claim`,
        summary: sql`excluded.summary`,
        readerValue: sql`excluded.reader_value`,
        sourceName: sql`excluded.source_name`,
        sourceUrl: sql`excluded.source_url`,
        triggerPassages: sql`excluded.trigger_passages`,
        triggerBooks: sql`excluded.trigger_books`,
        triggerKeywords: sql`excluded.trigger_keywords`,
        passageRefs: sql`excluded.passage_refs`,
        keywords: sql`excluded.keywords`,
        evidenceRefs: sql`excluded.evidence_refs`,
        status: sql`excluded.status`,
        reviewerNotes: sql`excluded.reviewer_notes`,
        updatedAt: new Date(),
      },
    });
}

function noteMatches(
  note: StudyNoteRow,
  {
    book,
    chapter,
    q,
  }: {
    book?: string;
    chapter?: number;
    q?: string;
  },
) {
  const currentRef = book && chapter ? `${book} ${chapter}` : "";
  const haystack = [
    note.topic,
    note.title,
    note.claim,
    note.summary,
    note.readerValue,
    ...note.triggerPassages,
    ...note.triggerBooks,
    ...note.triggerKeywords,
    ...note.passageRefs,
    ...note.keywords,
    ...note.evidenceRefs,
  ]
    .join(" ")
    .toLowerCase();

  const bookMatches =
    !book ||
    note.triggerBooks.some((b) => b.toLowerCase() === book.toLowerCase()) ||
    note.triggerPassages.some((p) =>
      p.toLowerCase().startsWith(book.toLowerCase()),
    ) ||
    note.passageRefs.some((p) =>
      p.toLowerCase().startsWith(book.toLowerCase()),
    );

  const passageMatches =
    !currentRef ||
    note.triggerPassages.some((p) =>
      p.toLowerCase().startsWith(currentRef.toLowerCase()),
    ) ||
    note.passageRefs.some((p) =>
      p.toLowerCase().startsWith(currentRef.toLowerCase()),
    ) ||
    bookMatches;

  const queryMatches =
    !q ||
    q
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .some((term) => haystack.includes(term));

  return bookMatches && passageMatches && queryMatches;
}

function serializeNote(
  note: StudyNoteRow,
  ratingStats?: {
    averageRating: number | null;
    ratingCount: number | null;
  },
) {
  return {
    id: note.id,
    topic: note.topic,
    language: note.language,
    title: note.title,
    claim: note.claim,
    summary: note.summary,
    readerValue: note.readerValue,
    sourceName: note.sourceName,
    sourceUrl: note.sourceUrl,
    triggerPassages: note.triggerPassages,
    triggerBooks: note.triggerBooks,
    triggerKeywords: note.triggerKeywords,
    passageRefs: note.passageRefs,
    keywords: note.keywords,
    evidenceRefs: note.evidenceRefs,
    status: note.status,
    reviewerNotes: note.reviewerNotes,
    averageRating: ratingStats?.averageRating ?? 0,
    ratingCount: ratingStats?.ratingCount ?? 0,
  };
}

async function loadRatingStats(noteId: string) {
  const [stats] = await db
    .select({
      averageRating: sql<number>`avg(${studyNoteRatingsTable.rating})::float`,
      ratingCount: sql<number>`count(*)::int`,
    })
    .from(studyNoteRatingsTable)
    .where(eq(studyNoteRatingsTable.noteId, noteId));

  return {
    averageRating: stats?.averageRating ?? 0,
    ratingCount: stats?.ratingCount ?? 0,
  };
}

router.get("/study-notes", async (req, res) => {
  const rawChapter = req.query["chapter"];
  const parsed = ListStudyNotesQueryParams.safeParse({
    book: req.query["book"],
    q: req.query["q"],
    chapter:
      typeof rawChapter === "string" && rawChapter.trim() !== ""
        ? Number(rawChapter)
        : undefined,
  });

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }

  try {
    await ensureSeeded();

    const rows = await db.select().from(studyNotesTable);
    const ratingRows = await db
      .select({
        noteId: studyNoteRatingsTable.noteId,
        averageRating: sql<number>`avg(${studyNoteRatingsTable.rating})::float`,
        ratingCount: sql<number>`count(*)::int`,
      })
      .from(studyNoteRatingsTable)
      .groupBy(studyNoteRatingsTable.noteId);

    const ratingsByNote = new Map(
      ratingRows.map((row) => [
        row.noteId,
        {
          averageRating: row.averageRating,
          ratingCount: row.ratingCount,
        },
      ]),
    );

    const notes = rows
      .filter((note) => noteMatches(note, parsed.data))
      .map((note) => serializeNote(note, ratingsByNote.get(note.id)));

    res.json(ListStudyNotesResponse.parse(notes));
  } catch (err) {
    req.log.error({ err }, "Failed to list study notes");
    res.status(500).json({
      error:
        "Study notes are unavailable. Run the database schema push before using this feature.",
    });
  }
});

router.post("/study-notes/:id/rating", async (req, res) => {
  const paramsParsed = RateStudyNoteParams.safeParse(req.params);
  const bodyParsed = RateStudyNoteBody.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid rating input" });
    return;
  }

  try {
    await ensureSeeded();

    const [note] = await db
      .select()
      .from(studyNotesTable)
      .where(eq(studyNotesTable.id, paramsParsed.data.id))
      .limit(1);

    if (!note) {
      res.status(404).json({ error: "Study note not found" });
      return;
    }

    const now = new Date();

    await db
      .insert(studyNoteRatingsTable)
      .values({
        noteId: paramsParsed.data.id,
        clientId: bodyParsed.data.clientId,
        rating: bodyParsed.data.rating,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [studyNoteRatingsTable.noteId, studyNoteRatingsTable.clientId],
        set: {
          rating: bodyParsed.data.rating,
          updatedAt: now,
        },
      });

    const [stats] = await db
      .select({
        averageRating: sql<number>`avg(${studyNoteRatingsTable.rating})::float`,
        ratingCount: sql<number>`count(*)::int`,
      })
      .from(studyNoteRatingsTable)
      .where(eq(studyNoteRatingsTable.noteId, paramsParsed.data.id));

    res.json(
      RateStudyNoteResponse.parse({
        id: paramsParsed.data.id,
        rating: bodyParsed.data.rating,
        averageRating: stats?.averageRating ?? bodyParsed.data.rating,
        ratingCount: stats?.ratingCount ?? 1,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to rate study note");
    res.status(500).json({
      error:
        "Study note ratings are unavailable. Run the database schema push before using this feature.",
    });
  }
});

router.patch("/study-notes/:id", async (req, res) => {
  const paramsParsed = UpdateStudyNoteParams.safeParse(req.params);
  const bodyParsed = UpdateStudyNoteBody.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid study note update" });
    return;
  }

  try {
    await ensureSeeded();

    const updates: Partial<typeof studyNotesTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (bodyParsed.data.status !== undefined) {
      updates.status = bodyParsed.data.status;
    }

    if (bodyParsed.data.reviewerNotes !== undefined) {
      updates.reviewerNotes = bodyParsed.data.reviewerNotes.trim() || null;
    }

    const [row] = await db
      .update(studyNotesTable)
      .set(updates)
      .where(eq(studyNotesTable.id, paramsParsed.data.id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Study note not found" });
      return;
    }

    const stats = await loadRatingStats(row.id);
    res.json(UpdateStudyNoteResponse.parse(serializeNote(row, stats)));
  } catch (err) {
    req.log.error({ err }, "Failed to update study note");
    res.status(500).json({ error: "Failed to update study note" });
  }
});

router.post("/study-notes/import", async (req, res) => {
  const parsed = ImportStudyNotesBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid study-note import" });
    return;
  }

  try {
    await ensureSeeded();

    if (parsed.data.notes.length === 0) {
      res.json(ImportStudyNotesResponse.parse({ imported: 0, ids: [] }));
      return;
    }

    const now = new Date();
    const notes = parsed.data.notes.map((note) => ({
      ...note,
      reviewerNotes: note.reviewerNotes?.trim() || null,
      updatedAt: now,
    }));

    await db
      .insert(studyNotesTable)
      .values(notes)
      .onConflictDoUpdate({
        target: studyNotesTable.id,
        set: {
          topic: sql`excluded.topic`,
          language: sql`excluded.language`,
          title: sql`excluded.title`,
          claim: sql`excluded.claim`,
          summary: sql`excluded.summary`,
          readerValue: sql`excluded.reader_value`,
          sourceName: sql`excluded.source_name`,
          sourceUrl: sql`excluded.source_url`,
          triggerPassages: sql`excluded.trigger_passages`,
          triggerBooks: sql`excluded.trigger_books`,
          triggerKeywords: sql`excluded.trigger_keywords`,
          passageRefs: sql`excluded.passage_refs`,
          keywords: sql`excluded.keywords`,
          evidenceRefs: sql`excluded.evidence_refs`,
          status: sql`excluded.status`,
          reviewerNotes: sql`excluded.reviewer_notes`,
          updatedAt: now,
        },
      });

    res.json(
      ImportStudyNotesResponse.parse({
        imported: notes.length,
        ids: notes.map((note) => note.id),
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to import study notes");
    res.status(500).json({ error: "Failed to import study notes" });
  }
});

export default router;
