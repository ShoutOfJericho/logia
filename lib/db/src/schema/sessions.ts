import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  doublePrecision,
  boolean,
  index,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";

export const sessionsTable = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    book: text("book").notNull(),
    chapter: integer("chapter").notNull(),
    title: text("title"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMs: integer("duration_ms").notNull().default(0),
    readingMs: integer("reading_ms").notNull().default(0),
    reflectionMs: integer("reflection_ms").notNull().default(0),
    averageExcitement: doublePrecision("average_excitement")
      .notNull()
      .default(0),
    peakExcitement: doublePrecision("peak_excitement").notNull().default(0),
    ahaCount: integer("aha_count").notNull().default(0),
    wordCount: integer("word_count").notNull().default(0),
  },
  (t) => ({
    startedAtIdx: index("sessions_started_at_idx").on(t.startedAt),
    bookChapterIdx: index("sessions_book_chapter_idx").on(t.book, t.chapter),
  }),
);

export const segmentsTable = pgTable(
  "segments",
  {
    id: text("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessionsTable.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["reading", "reflection"] }).notNull(),
    text: text("text").notNull(),
    startedAt: integer("started_at_ms").notNull(),
    endedAt: integer("ended_at_ms").notNull(),
    excitement: doublePrecision("excitement").notNull().default(0),
    f0Mean: doublePrecision("f0_mean"),
    f0Std: doublePrecision("f0_std"),
    jitter: doublePrecision("jitter"),
    shimmer: doublePrecision("shimmer"),
    hnr: doublePrecision("hnr"),
    isAha: boolean("is_aha").notNull().default(false),
    ahaPhrase: text("aha_phrase"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    sessionIdx: index("segments_session_idx").on(t.sessionId),
  }),
);

export const studyNotesTable = pgTable(
  "study_notes",
  {
    id: text("id").primaryKey(),
    topic: text("topic").notNull(),
    language: text("language", { enum: ["hebrew", "aramaic", "greek"] })
      .notNull(),
    title: text("title").notNull(),
    claim: text("claim").notNull(),
    summary: text("summary").notNull(),
    readerValue: text("reader_value").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    triggerPassages: jsonb("trigger_passages").$type<string[]>().notNull(),
    triggerBooks: jsonb("trigger_books").$type<string[]>().notNull(),
    triggerKeywords: jsonb("trigger_keywords").$type<string[]>().notNull(),
    passageRefs: jsonb("passage_refs").$type<string[]>().notNull(),
    keywords: jsonb("keywords").$type<string[]>().notNull(),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull(),
    status: text("status", { enum: ["approved", "needs-review"] }).notNull(),
    reviewerNotes: text("reviewer_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    languageIdx: index("study_notes_language_idx").on(t.language),
    statusIdx: index("study_notes_status_idx").on(t.status),
  }),
);

export const studyNoteRatingsTable = pgTable(
  "study_note_ratings",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => studyNotesTable.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.noteId, t.clientId] }),
    noteIdx: index("study_note_ratings_note_idx").on(t.noteId),
  }),
);

export type SessionRow = typeof sessionsTable.$inferSelect;
export type SegmentRow = typeof segmentsTable.$inferSelect;
export type InsertSegment = typeof segmentsTable.$inferInsert;
export type StudyNoteRow = typeof studyNotesTable.$inferSelect;
export type InsertStudyNote = typeof studyNotesTable.$inferInsert;
