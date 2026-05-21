import type { TranscriptSegment } from "@workspace/api-client-react";

export type SermonFlowBranchType =
  | "reader-reflection"
  | "aha"
  | "important-quote"
  | "high-energy-quote"
  | "application"
  | "cross-reference"
  | "historical-context";

export interface SermonFlowBranch {
  id: string;
  type: SermonFlowBranchType;
  label: string;
  text: string;
  segmentId?: string;
  excitement?: number;
}

export interface SermonFlowNode {
  id: string;
  verse: number;
  verseRange: string;
  sourceQuote: string;
  mainIdea: string;
  branches: SermonFlowBranch[];
}

export interface PassageVerse {
  verse: number;
  text: string;
}

export interface HighEnergyQuote {
  id: string;
  quote: string;
  segment: TranscriptSegment;
  score?: number;
  reasons?: string[];
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function wordSet(text: string) {
  return new Set(
    normalize(text)
      .split(" ")
      .filter((w) => w.length > 3),
  );
}

function overlapScore(a: string, b: string) {
  const A = wordSet(a);
  const B = wordSet(b);
  if (A.size === 0 || B.size === 0) return 0;

  let overlap = 0;
  for (const word of A) {
    if (B.has(word)) overlap += 1;
  }

  return overlap / Math.sqrt(A.size * B.size);
}

function bestVerseForText(text: string, verses: PassageVerse[]) {
  let best = verses[0];
  let bestScore = 0;

  for (const verse of verses) {
    const score = overlapScore(text, verse.text);
    if (score > bestScore) {
      best = verse;
      bestScore = score;
    }
  }

  return {
    verse: best,
    score: bestScore,
  };
}

function shortLabelForVerse(text: string) {
  const cleaned = text.trim();
  if (cleaned.length <= 54) return cleaned;
  return `${cleaned.slice(0, 54).trim()}…`;
}

function makeBranchId(prefix: string, id: string) {
  return `${prefix}-${id}`.replace(/[^a-zA-Z0-9-_]/g, "-");
}

export function generateSermonFlow({
  verses,
  segments,
  highEnergyQuotes,
}: {
  verses: PassageVerse[];
  segments: TranscriptSegment[];
  highEnergyQuotes?: HighEnergyQuote[];
}): SermonFlowNode[] {
  const nodes: SermonFlowNode[] = verses.map((verse) => ({
    id: `verse-${verse.verse}`,
    verse: verse.verse,
    verseRange: `v. ${verse.verse}`,
    sourceQuote: verse.text,
    mainIdea: shortLabelForVerse(verse.text),
    branches: [],
  }));

  const nodeByVerse = new Map(nodes.map((node) => [node.verse, node]));

  for (const segment of segments) {
    if (segment.kind !== "reflection") continue;

    const match = bestVerseForText(segment.text, verses);
    const target = nodeByVerse.get(match.verse.verse);
    if (!target) continue;

    const isStrongMatch = match.score >= 0.08;
    const isAha = segment.isAha;
    const isHighEnergy = (segment.excitement ?? 0) >= 0.45;

    if (!isStrongMatch && !isAha && !isHighEnergy) continue;

    target.branches.push({
      id: makeBranchId("reflection", segment.id),
      type: isAha ? "aha" : "reader-reflection",
      label: isAha ? "Aha moment" : "Reader reflection",
      text: segment.text,
      segmentId: segment.id,
      excitement: segment.excitement ?? 0,
    });
  }

  for (const item of highEnergyQuotes ?? []) {
    const match = bestVerseForText(item.quote, verses);
    const target = nodeByVerse.get(match.verse.verse);
    if (!target) continue;

    target.branches.push({
      id: makeBranchId("high-energy", item.id),
      type: "high-energy-quote",
      label: "High-energy quote",
      text: item.quote,
      segmentId: item.segment.id,
      excitement: item.segment.excitement ?? 0,
    });
  }

  return nodes;
}