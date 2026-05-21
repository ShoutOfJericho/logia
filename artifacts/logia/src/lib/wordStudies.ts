export type WordStudy = {
  id: string;
  language: "hebrew" | "greek" | "aramaic";
  lemma: string;
  transliteration: string;
  strong: string;
  glosses: string[];
  meaning: string;
  relatedVerses: string[];
  aiInsightPlaceholder?: string;
};

export const WORD_STUDIES: WordStudy[] = [
  {
    id: "yom",
    language: "hebrew",
    lemma: "יוֹם",
    transliteration: "yom",
    strong: "H3117",
    glosses: ["day", "time", "period"],
    meaning:
      "Can refer to a day, a time period, or an era depending on context.",
    relatedVerses: ["Genesis 1", "Daniel 8:26"],
    aiInsightPlaceholder:
      "Future AI commentary will compare how yom is used across passages.",
  },

  {
    id: "agape",
    language: "greek",
    lemma: "ἀγάπη",
    transliteration: "agape",
    strong: "G26",
    glosses: ["love", "charity", "selfless love"],
    meaning:
      "Often used to describe sacrificial or divine love in the New Testament.",
    relatedVerses: ["John 3:16", "1 Corinthians 13"],
    aiInsightPlaceholder:
      "Future AI commentary will analyze agape across NT passages.",
  },

  {
    id: "aphiemi",
    language: "greek",
    lemma: "ἀφίημι",
    transliteration: "aphiēmi",
    strong: "G863",
    glosses: ["forgive", "release", "send away"],
    meaning:
      "Carries the sense of releasing or letting go, often in forgiveness contexts.",
    relatedVerses: ["Matthew 6:12", "Matthew 18:22"],
    aiInsightPlaceholder:
      "Future AI commentary will compare forgiveness language across scripture.",
  },
];

export function findWordStudies(text: string) {
  const lower = text.toLowerCase();

  return WORD_STUDIES.filter((entry) => {
    return (
      lower.includes(entry.transliteration.toLowerCase()) ||
      entry.relatedVerses.some((v) =>
        lower.includes(v.toLowerCase()),
      ) ||
      entry.glosses.some((g) =>
        lower.includes(g.toLowerCase()),
      )
    );
  });
}