export type HebrewLexicalCard = {
  id: string;
  lemma: string;
  transliteration: string;
  glosses: string[];
  strong?: string;
  occurrences: string[];
};

export const HEBREW_LEXICAL_CARDS: HebrewLexicalCard[] = [
  {
    id: "davar",
    lemma: "דָּבָר",
    transliteration: "davar",
    strong: "H1697",
    glosses: ["word", "matter", "thing", "speech"],
    occurrences: ["Genesis 15:1", "1 Samuel 3:1", "Psalm 119:105"],
  },
  {
    id: "yom",
    lemma: "יוֹם",
    transliteration: "yom",
    strong: "H3117",
    glosses: ["day", "time", "period"],
    occurrences: ["Genesis 1:5", "Genesis 2:4", "Daniel 8:26"],
  },
  {
    id: "elohim",
    lemma: "אֱלֹהִים",
    transliteration: "elohim",
    strong: "H430",
    glosses: ["God", "gods", "mighty ones"],
    occurrences: ["Genesis 1:1", "Psalm 82:1"],
  },
];