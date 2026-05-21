import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  doublePrecision,
  boolean,
  index,
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

export type SessionRow = typeof sessionsTable.$inferSelect;
export type SegmentRow = typeof segmentsTable.$inferSelect;
export type InsertSegment = typeof segmentsTable.$inferInsert;
