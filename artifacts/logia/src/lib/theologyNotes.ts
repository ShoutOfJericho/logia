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

  {
    id: "john-21-153-fish-gematria",
    topic: "153 fish",
  
    language: "hebrew",
  
    title: "153 fish and Hebrew gematria",
  
    claim:
      "Some interpreters connect the 153 fish in John 21:11 with Hebrew gematria, including the phrase Ani Elohim, often rendered 'I am God.' This should be treated as a candidate interpretation because other explanations for 153 also exist.",
  
    sourceName: "Verse By Verse Ministry",
  
    sourceUrl:
      "https://versebyverseministry.org/bible-answers/153-fishes-i-am-g-d",
  
    triggerPassages: ["John 21"],
  
    triggerBooks: ["John"],
  
    triggerKeywords: ["153", "fish", "net", "catch", "gematria"],
  
    passageRefs: ["John 21:11"],
  
    keywords: ["153", "fish", "gematria", "john 21", "i am god", "ani elohim"],
  
    evidenceRefs: ["John 21:11"],
  
    status: "needs-review",
  
    reviewerNotes:
      "Treat carefully. Other interpretations of 153 exist, including Augustine's triangular-number explanation and other proposed Hebrew gematria readings.",
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