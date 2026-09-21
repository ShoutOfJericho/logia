export type TheologyNote = {
  id: string;

  topic: string;

  language?: "hebrew" | "greek" | "aramaic";

  title: string;

  claim: string;

  summary?: string;

  readerValue?: string;

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
      "The Hebrew word yom can refer to an ordinary day, the daylight portion of a day, or a broader period of time depending on context.",

    summary:
      "Genesis uses yom in a debated creation context. The linked study argues that yom with numbered days and the evening/morning pattern most naturally points to ordinary days, while also noting places such as Genesis 2:4 and Daniel 8:26 where related time language can stretch beyond a simple daylight cycle.",

    readerValue:
      "This helps readers notice that the question is not just English word meaning. The interpretation depends on Hebrew usage, grammar, repeated phrases, and cross-references.",

    sourceName: "GotQuestions",

    sourceUrl:
      "https://www.gotquestions.org/Genesis-days.html",

    triggerPassages: ["Genesis 1", "Genesis 2", "Daniel 8"],

    triggerBooks: ["Genesis"],

    triggerKeywords: ["creation", "evening", "morning", "day", "days", "yom"],

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
      "Summarized manually from GotQuestions article. Keep the summary original, link to the article, and avoid presenting one debated interpretation as the only possible view.",
  },

  {
    id: "aramaic-son-of-man-daniel-7",
    topic: "bar enash",

    language: "aramaic",

    title: "Aramaic 'son of man' in Daniel 7",

    claim:
      "Daniel 7 uses Aramaic son-of-man language for a heavenly figure who receives dominion, glory, and a kingdom.",

    summary:
      "The phrase can sound simply human, but Daniel 7 places the figure in a throne-room vision and gives him everlasting dominion. That background matters when later readers hear 'Son of Man' language in the Gospels.",

    readerValue:
      "This gives readers a bridge from Aramaic Daniel to New Testament Christology without forcing them to know the original-language background already.",

    sourceName: "BibleHub Lexicon",

    sourceUrl: "https://biblehub.com/aramaic/606.htm",

    triggerPassages: ["Daniel 7"],

    triggerBooks: ["Daniel"],

    triggerKeywords: ["son of man", "dominion", "kingdom", "ancient of days"],

    passageRefs: ["Daniel 7:13-14"],

    keywords: ["bar enash", "son of man", "daniel 7", "dominion", "aramaic"],

    evidenceRefs: ["Daniel 7:13", "Daniel 7:14", "Mark 14:62"],

    status: "needs-review",

    reviewerNotes:
      "Starter note. Needs review against a fuller Aramaic lexicon and Daniel commentary.",
  },

  {
    id: "greek-logos-john-1",
    topic: "logos",

    language: "greek",

    title: "Logos as word, message, and divine self-expression",

    claim:
      "Logos can mean word, speech, message, reason, or account, and John 1 uses it in a uniquely Christ-centered way.",

    summary:
      "John's opening does more than say Jesus is a spoken word. Logos language gathers speech, revelation, reason, and divine self-expression into a claim about the Word who was with God and was God.",

    readerValue:
      "This helps readers slow down when they see 'Word' in John 1 and ask what range of meaning the Greek term is carrying.",

    sourceName: "BibleHub Greek Lexicon",

    sourceUrl: "https://biblehub.com/greek/3056.htm",

    triggerPassages: ["John 1"],

    triggerBooks: ["John"],

    triggerKeywords: ["word", "logos", "beginning", "with god"],

    passageRefs: ["John 1:1-14"],

    keywords: ["logos", "word", "john 1", "greek", "message", "reason"],

    evidenceRefs: ["John 1:1", "John 1:14", "1 John 1:1"],

    status: "needs-review",

    reviewerNotes:
      "Starter note. Keep concise and link outward for lexical depth.",
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
