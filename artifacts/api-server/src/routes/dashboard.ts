import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import {
  GetDashboardSummaryResponse,
  ListAhaMomentsQueryParams,
  ListAhaMomentsResponse,
  ListExcitedPassagesResponse,
} from "@workspace/api-zod";
import { db, sessionsTable, segmentsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res) => {
  const [agg] = await db
    .select({
      totalSessions: sql<number>`count(*)::int`,
      totalReadingMs: sql<number>`coalesce(sum(${sessionsTable.readingMs}), 0)::int`,
      totalReflectionMs: sql<number>`coalesce(sum(${sessionsTable.reflectionMs}), 0)::int`,
      totalAhaMoments: sql<number>`coalesce(sum(${sessionsTable.ahaCount}), 0)::int`,
      averageExcitement: sql<number>`coalesce(avg(nullif(${sessionsTable.averageExcitement}, 0)), 0)::float`,
      uniqueBooks: sql<number>`count(distinct ${sessionsTable.book})::int`,
      uniqueChapters: sql<number>`count(distinct (${sessionsTable.book} || ' ' || ${sessionsTable.chapter}))::int`,
    })
    .from(sessionsTable);

  const dayRows = await db
    .select({
      day: sql<string>`to_char(${sessionsTable.startedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
    })
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.startedAt));

  const uniqueDays = Array.from(new Set(dayRows.map((d) => d.day))).sort(
    (a, b) => (a < b ? 1 : -1),
  );
  let streak = 0;
  if (uniqueDays.length > 0) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterdayStr = new Date(today.getTime() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    let cursor: Date;
    if (uniqueDays[0] === todayStr) {
      cursor = new Date(`${todayStr}T00:00:00Z`);
    } else if (uniqueDays[0] === yesterdayStr) {
      cursor = new Date(`${yesterdayStr}T00:00:00Z`);
    } else {
      cursor = null as unknown as Date;
    }
    if (cursor) {
      const set = new Set(uniqueDays);
      while (set.has(cursor.toISOString().slice(0, 10))) {
        streak += 1;
        cursor = new Date(cursor.getTime() - 86_400_000);
      }
    }
  }

  const data = GetDashboardSummaryResponse.parse({
    totalSessions: agg?.totalSessions ?? 0,
    totalReadingMs: agg?.totalReadingMs ?? 0,
    totalReflectionMs: agg?.totalReflectionMs ?? 0,
    totalAhaMoments: agg?.totalAhaMoments ?? 0,
    averageExcitement: agg?.averageExcitement ?? 0,
    uniqueBooks: agg?.uniqueBooks ?? 0,
    uniqueChapters: agg?.uniqueChapters ?? 0,
    currentStreakDays: streak,
  });
  res.json(data);
});

router.get("/dashboard/aha-moments", async (req, res) => {
  const rawLimit = req.query["limit"];
  const parsed = ListAhaMomentsQueryParams.safeParse({
    limit:
      typeof rawLimit === "string" && rawLimit.trim() !== ""
        ? Number(rawLimit)
        : undefined,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const limit = parsed.data.limit ?? 50;

  const rows = await db
    .select({
      id: segmentsTable.id,
      text: segmentsTable.text,
      phrase: segmentsTable.ahaPhrase,
      excitement: segmentsTable.excitement,
      timestampMs: segmentsTable.startedAt,
      sessionId: segmentsTable.sessionId,
      book: sessionsTable.book,
      chapter: sessionsTable.chapter,
      sessionStartedAt: sessionsTable.startedAt,
    })
    .from(segmentsTable)
    .innerJoin(sessionsTable, sql`${segmentsTable.sessionId} = ${sessionsTable.id}`)
    .where(sql`${segmentsTable.isAha} = true`)
    .orderBy(desc(sessionsTable.startedAt))
    .limit(limit);

  const data = ListAhaMomentsResponse.parse(
    rows.map((r) => ({
      id: r.id,
      text: r.text,
      phrase: r.phrase ?? "",
      excitement: r.excitement,
      timestampMs: r.timestampMs,
      sessionId: r.sessionId,
      book: r.book,
      chapter: r.chapter,
      sessionStartedAt: r.sessionStartedAt,
    })),
  );
  res.json(data);
});

router.get("/dashboard/excited-passages", async (_req, res) => {
  const rows = await db
    .select({
      book: sessionsTable.book,
      chapter: sessionsTable.chapter,
      averageExcitement: sql<number>`avg(${sessionsTable.averageExcitement})::float`,
      sessionCount: sql<number>`count(*)::int`,
      peakExcitement: sql<number>`max(${sessionsTable.peakExcitement})::float`,
    })
    .from(sessionsTable)
    .where(sql`${sessionsTable.averageExcitement} > 0`)
    .groupBy(sessionsTable.book, sessionsTable.chapter)
    .orderBy(sql`avg(${sessionsTable.averageExcitement}) desc`)
    .limit(10);

  const data = ListExcitedPassagesResponse.parse(rows);
  res.json(data);
});

export default router;
