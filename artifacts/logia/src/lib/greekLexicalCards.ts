export type GreekLexicalCard = {
  id: string;
  lemma: string;
  transliteration: string;
  glosses: string[];
  strong?: string;
  occurrences: string[];
};

export const GREEK_LEXICAL_CARDS: GreekLexicalCard[] = [
  {
    id: "agapao",
    lemma: "ἀγαπάω",
    transliteration: "agapaō",
    strong: "G25",
    glosses: ["love", "cherish", "show love"],
    occurrences: ["John 3:16", "John 13:34", "Romans 8:28"],
  },
  {
    id: "phileo",
    lemma: "φιλέω",
    transliteration: "phileō",
    strong: "G5368",
    glosses: ["love", "have affection", "friendship love"],
    occurrences: ["John 21:15", "John 21:16", "John 21:17"],
  },
];

export function findGreekLexicalCards(text: string) {
  const lower = text.toLowerCase();

  return GREEK_LEXICAL_CARDS.filter((card) => {
    return (
      lower.includes(card.transliteration.toLowerCase()) ||
      card.glosses.some((g) => lower.includes(g.toLowerCase())) ||
      card.occurrences.some((r) => lower.includes(r.toLowerCase()))
    );
  });
}