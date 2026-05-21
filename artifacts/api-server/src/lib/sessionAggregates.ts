import type { SegmentRow, SessionRow } from "@workspace/db";

interface AggregateInput {
  startedAt: Date;
  endedAt: Date | null;
  segments: SegmentRow[];
}

export interface SessionAggregates {
  durationMs: number;
  readingMs: number;
  reflectionMs: number;
  averageExcitement: number;
  peakExcitement: number;
  ahaCount: number;
  wordCount: number;
}

export function computeAggregates(input: AggregateInput): SessionAggregates {
  const { startedAt, endedAt, segments } = input;
  const segmentDurationMs = segments.reduce(
    (max, s) => Math.max(max, s.endedAt),
    0,
);

  const durationMs =
    segmentDurationMs > 0
      ? segmentDurationMs
      : endedAt
        ? Math.max(0, endedAt.getTime() - startedAt.getTime())
        : 0;

  let readingMs = 0;
  let reflectionMs = 0;
  let weightedExcitement = 0;
  let weight = 0;
  let peakExcitement = 0;
  let ahaCount = 0;
  let wordCount = 0;

  for (const s of segments) {
    const segDur = Math.max(0, s.endedAt - s.startedAt);
    if (s.kind === "reading") readingMs += segDur;
    else reflectionMs += segDur;
    const w = Math.max(segDur, 1);
    weightedExcitement += (s.excitement ?? 0) * w;
    weight += w;
    if ((s.excitement ?? 0) > peakExcitement) peakExcitement = s.excitement;
    if (s.isAha) ahaCount += 1;
    wordCount += s.text.trim().split(/\s+/).filter(Boolean).length;
  }

  const averageExcitement = weight > 0 ? weightedExcitement / weight : 0;

  return {
    durationMs,
    readingMs,
    reflectionMs,
    averageExcitement,
    peakExcitement,
    ahaCount,
    wordCount,
  };
}

export function summaryFromRow(row: SessionRow) {
  return {
    id: row.id,
    book: row.book,
    chapter: row.chapter,
    title: row.title,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationMs: row.durationMs,
    readingMs: row.readingMs,
    reflectionMs: row.reflectionMs,
    averageExcitement: row.averageExcitement,
    peakExcitement: row.peakExcitement,
    ahaCount: row.ahaCount,
    wordCount: row.wordCount,
  };
}

export function segmentsToAhaMoments(segments: SegmentRow[]) {
  return segments
    .filter((s) => s.isAha)
    .map((s) => ({
      id: s.id,
      text: s.text,
      phrase: s.ahaPhrase ?? "",
      excitement: s.excitement ?? 0,
      timestampMs: s.startedAt,
    }));
}
