import type { TranscriptSegment } from "@workspace/api-client-react";

export interface QuoteAnchor {
  id: string;
  referenceLabel: string;
  book?: string;
  chapter?: number;
  relation: "mainline" | "offshoot";
  connectionIdea: string;
  verse?: number;
  quoteText?: string;
  anchorSegmentId: string;
  anchorText: string;
  commentarySegments: TranscriptSegment[];
}

const bookNames = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "Samuel", "Kings", "Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Isaiah", "Jeremiah", "Ezekiel", "Daniel",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
  "Corinthians", "Galatians", "Ephesians", "Philippians",
  "Colossians", "Thessalonians", "Timothy", "Titus", "Philemon",
  "Hebrews", "James", "Peter", "Jude", "Revelation",
];

function findReference(text: string) {
  const normalized = text.replace(/\bchapter\b/gi, "").replace(/\bverse\b/gi, "");
  const bookPattern = bookNames.join("|");

  const match = normalized.match(
    new RegExp(`\\b(${bookPattern})\\b\\s+(\\d{1,3})\\s*[: ]\\s*(\\d{1,3})`, "i"),
  );

  if (!match) return null;

  return {
    book: match[1],
    chapter: Number(match[2]),
    verse: Number(match[3]),
    label: `${match[1]} ${match[2]}:${match[3]}`,
  };
}

function findQuotedSpeech(text: string) {
  const quoteMatch =
    text.match(/quote\s+(.+?)\s+end quote/i) ||
    text.match(/quote\s+(.+)/i);

  return quoteMatch?.[1]?.trim() ?? undefined;
}

function sameReferenceContext(
  reference: { book: string; chapter: number } | null,
  currentBook: string,
  currentChapter: number,
) {
  if (!reference) return false;

  return (
    reference.book.toLowerCase().trim() === currentBook.toLowerCase().trim() &&
    reference.chapter === currentChapter
  );
}

function extractConnectionIdea(text: string) {
  return text
    .replace(/quote\s+.+?(end quote)?/gi, "")
    .replace(/\b(?:1st|2nd|3rd|first|second|third|1|2|3)?\s*[A-Za-z]+\s+(?:chapter\s+)?\d{1,3}\s*(?:verse|:)?\s*\d{1,3}/gi, "")
    .trim()
    .slice(0, 180);
}

export function generateQuoteAnchors({
  segments,
  currentBook,
  currentChapter,
  commentaryWindow = 3,
}: {
  segments: TranscriptSegment[];
  currentBook: string;
  currentChapter: number;
  commentaryWindow?: number;
}): QuoteAnchor[] {
  const anchors: QuoteAnchor[] = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const reference = findReference(segment.text);
    console.log("ANCHOR", reference?.label);
    const quoteText = findQuotedSpeech(segment.text);

    if (!reference && !quoteText) continue;

    const commentarySegments = segments
      .slice(i + 1, i + 1 + commentaryWindow)
      .filter((s) => s.kind === "reflection");

    const relation = sameReferenceContext(
        reference,
        currentBook,
        currentChapter,
        )
        ? "mainline"
        : "offshoot";

        const connectionIdea = extractConnectionIdea(segment.text);

    anchors.push({
      id: `quote-anchor-${segment.id}`,
      referenceLabel: reference?.label ?? "Quoted passage",
      book: reference?.book,
      chapter: reference?.chapter,
      verse: reference?.verse,
      quoteText,
      relation,
      connectionIdea,
      anchorSegmentId: segment.id,
      anchorText: segment.text,
      commentarySegments,
    });
  }

  return anchors;
}