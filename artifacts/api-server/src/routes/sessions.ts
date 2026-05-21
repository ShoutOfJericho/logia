import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import {
  CreateSessionBody,
  GetSessionParams,
  GetSessionResponse,
  ListSessionsQueryParams,
  ListSessionsResponse,
  ListRecentSessionsResponse,
  UpdateSessionBody,
  UpdateSessionParams,
  UpdateSessionResponse,
  DeleteSessionParams,
} from "@workspace/api-zod";
import {
  db,
  sessionsTable,
  segmentsTable,
  type InsertSegment,
  type SegmentRow,
} from "@workspace/db";
import {
  computeAggregates,
  segmentsToAhaMoments,
  summaryFromRow,
} from "../lib/sessionAggregates";

const router: IRouter = Router();

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : value;
}

function serializeSession<T extends Record<string, unknown>>(session: T) {
  return {
    ...session,
    startedAt: serializeDate(session.startedAt),
    endedAt: serializeDate(session.endedAt),
  };
}

function serializeSegment(s: SegmentRow) {
  return {
    id: s.id,
    kind: s.kind,
    text: s.text,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    excitement: s.excitement ?? 0,
    f0Mean: s.f0Mean,
    f0Std: s.f0Std,
    jitter: s.jitter,
    shimmer: s.shimmer,
    hnr: s.hnr,
    isAha: s.isAha,
    ahaPhrase: s.ahaPhrase,
  };
}

async function loadFullSession(id: string) {
  const [row] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, id))
    .limit(1);

  if (!row) return null;

  const segs = await db
    .select()
    .from(segmentsTable)
    .where(eq(segmentsTable.sessionId, id))
    .orderBy(asc(segmentsTable.startedAt));

  return serializeSession({
    ...summaryFromRow(row),
    segments: segs.map(serializeSegment),
    ahaMoments: segmentsToAhaMoments(segs),
  });
}

router.get("/sessions", async (req, res) => {
  const parsed = ListSessionsQueryParams.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }

  const limit = parsed.data.limit ?? 100;

  const rows = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.startedAt))
    .limit(limit);

  const sessions = rows.map((row) => serializeSession(summaryFromRow(row)));

  res.json(ListSessionsResponse.parse(sessions));
});

router.get("/sessions/recent", async (_req, res) => {
  const rows = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.startedAt))
    .limit(5);

  const sessions = rows.map((row) => serializeSession(summaryFromRow(row)));

  res.json(ListRecentSessionsResponse.parse(sessions));
});

router.post("/sessions", async (req, res) => {
  const parsed = CreateSessionBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid session input" });
    return;
  }

  const [row] = await db
    .insert(sessionsTable)
    .values({
      book: parsed.data.book.trim(),
      chapter: parsed.data.chapter,
      title: parsed.data.title?.trim() || null,
    })
    .returning();

  if (!row) {
    res.status(500).json({ error: "Failed to create session" });
    return;
  }

  const session = serializeSession({
    ...summaryFromRow(row),
    segments: [],
    ahaMoments: [],
  });

  res.status(201).json(GetSessionResponse.parse(session));
});

router.get("/sessions/:id", async (req, res) => {
  const parsed = GetSessionParams.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const session = await loadFullSession(parsed.data.id);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(GetSessionResponse.parse(session));
});

router.patch("/sessions/:id", async (req, res) => {
  const paramsParsed = UpdateSessionParams.safeParse(req.params);

  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const bodyParsed = UpdateSessionBody.safeParse(req.body);

  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid update body" });
    return;
  }

  const id = paramsParsed.data.id;
  const body = bodyParsed.data;

  const [existing] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (body.replaceSegments) {
    await db.delete(segmentsTable).where(eq(segmentsTable.sessionId, id));

    if (body.replaceSegments.length > 0) {
      const rows: InsertSegment[] = body.replaceSegments.map((s) => ({
        id: s.id,
        sessionId: id,
        kind: s.kind,
        text: s.text,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        excitement: s.excitement,
        f0Mean: s.f0Mean ?? null,
        f0Std: s.f0Std ?? null,
        jitter: s.jitter ?? null,
        shimmer: s.shimmer ?? null,
        hnr: s.hnr ?? null,
        isAha: s.isAha,
        ahaPhrase: s.ahaPhrase ?? null,
      }));

      await db.insert(segmentsTable).values(rows).onConflictDoNothing();
    }
  }

  if (body.appendSegments && body.appendSegments.length > 0) {
    const rows: InsertSegment[] = body.appendSegments.map((s) => ({
      id: s.id,
      sessionId: id,
      kind: s.kind,
      text: s.text,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      excitement: s.excitement,
      f0Mean: s.f0Mean ?? null,
      f0Std: s.f0Std ?? null,
      jitter: s.jitter ?? null,
      shimmer: s.shimmer ?? null,
      hnr: s.hnr ?? null,
      isAha: s.isAha,
      ahaPhrase: s.ahaPhrase ?? null,
    }));

    await db.insert(segmentsTable).values(rows).onConflictDoNothing();
  }

  const updates: Partial<typeof sessionsTable.$inferInsert> = {};

  if (body.title !== undefined) {
    updates.title = body.title.trim() || null;
  }

  if (body.endedAt !== undefined) {
    updates.endedAt = new Date(body.endedAt);
  }

  if (body.finalize || body.appendSegments || body.replaceSegments) {
    const segs = await db
      .select()
      .from(segmentsTable)
      .where(eq(segmentsTable.sessionId, id))
      .orderBy(asc(segmentsTable.startedAt));

    const endedAt =
      body.endedAt !== undefined
        ? new Date(body.endedAt)
        : body.finalize
          ? new Date()
          : existing.endedAt;

    const aggs = computeAggregates({
      startedAt: existing.startedAt,
      endedAt,
      segments: segs,
    });

    updates.durationMs = aggs.durationMs;
    updates.readingMs = aggs.readingMs;
    updates.reflectionMs = aggs.reflectionMs;
    updates.averageExcitement = aggs.averageExcitement;
    updates.peakExcitement = aggs.peakExcitement;
    updates.ahaCount = aggs.ahaCount;
    updates.wordCount = aggs.wordCount;

    if (body.finalize) {
      updates.endedAt = endedAt;
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(sessionsTable).set(updates).where(eq(sessionsTable.id, id));
  }

  const fresh = await loadFullSession(id);

  if (!fresh) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(UpdateSessionResponse.parse(fresh));
});

router.delete("/sessions/:id", async (req, res) => {
  const parsed = DeleteSessionParams.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(sessionsTable).where(eq(sessionsTable.id, parsed.data.id));

  res.status(204).send();
});

export default router;