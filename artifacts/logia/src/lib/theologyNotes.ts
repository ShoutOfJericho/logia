export type TheologyNote = {
  id: string;

  topic: string;

  language?: "hebrew" | "greek" | "aramaic";

  title: string;

  claim: string;

  sourceName: string;
  sourceUrl: string;

  triggerPassages?: string[];
  triggerBooks?: string[];
  triggerKeywords?: string[];

  passageRefs: string[];

  keywords: string[];

  evidenceRefs?: string[];

  status: "approved" | "needs-review";

  reviewerNotes?: string;
};

export const THEOLOGY_NOTES: TheologyNote[] = [
  {
    id: "yom-genesis-days",
    topic: "yom",

    language: "hebrew",

    title: "The meaning of yom in Genesis",

    claim:
      "The Hebrew word yom can refer to a literal day, daylight, or an unspecified time period depending on context.",

    sourceName: "GotQuestions",

    sourceUrl:
      "https://www.gotquestions.org/Genesis-days.html",

    triggerPassages: ["Genesis 1", "Genesis 2", "Daniel 8"],

    triggerBooks: ["Genesis"], 

    triggerKeywords: ["creation", "evening", "morning", "day", "days"],

    passageRefs: [
      "Genesis 1",
      "Genesis 2:4",
      "Daniel 8:26",
    ],

    keywords: [
      "yom",
      "day",
      "creation",
      "genesis",
      "evening",
      "morning",
    ],

    evidenceRefs: [
      "Genesis 7:11",
      "Genesis 1:16",
      "Daniel 8:26",
    ],

    status: "approved",

    reviewerNotes:
      "Summarized manually from GotQuestions article. Avoid overstating conclusion.",
  },
];

export function findTheologyNotes({
  text,
  currentBook,
  currentChapter,
}: {
  text: string;
  currentBook?: string;
  currentChapter?: number;
}) {
  const lower = text.toLowerCase();
  const currentRef =
    currentBook && currentChapter ? `${currentBook} ${currentChapter}` : "";

  return THEOLOGY_NOTES.filter((note) => {
    return (
      note.keywords.some((k) => lower.includes(k.toLowerCase())) ||
      note.passageRefs.some((r) => lower.includes(r.toLowerCase())) ||
      note.triggerKeywords?.some((k) => lower.includes(k.toLowerCase())) ||
      note.triggerBooks?.some(
        (b) => b.toLowerCase() === currentBook?.toLowerCase(),
      ) ||
      note.triggerPassages?.some(
        (p) => p.toLowerCase() === currentRef.toLowerCase(),
      )
    );
  });
}