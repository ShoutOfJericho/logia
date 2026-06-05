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

  {
    id: "logos",
    lemma: "λόγος",
    transliteration: "logos",
    strong: "G3056",
    glosses: ["word", "speech", "message", "reason"],
    occurrences: ["John 1:1", "John 1:14", "Hebrews 4:12"],
  },
  {
    id: "pistis",
    lemma: "πίστις",
    transliteration: "pistis",
    strong: "G4102",
    glosses: ["faith", "trust", "belief", "faithfulness"],
    occurrences: ["Romans 1:17", "Ephesians 2:8", "Hebrews 11:1"],
  },
  {
    id: "metanoia",
    lemma: "μετάνοια",
    transliteration: "metanoia",
    strong: "G3341",
    glosses: ["repentance", "change of mind"],
    occurrences: ["Matthew 3:8", "Acts 2:38", "2 Corinthians 7:10"],
  },
  {
    id: "hamartia",
    lemma: "ἁμαρτία",
    transliteration: "hamartia",
    strong: "G266",
    glosses: ["sin", "missing the mark", "offense"],
    occurrences: ["John 1:29", "Romans 6:23", "1 John 1:9"],
  },
  {
    id: "charis",
    lemma: "χάρις",
    transliteration: "charis",
    strong: "G5485",
    glosses: ["grace", "favor", "gift"],
    occurrences: ["John 1:14", "Ephesians 2:8", "Titus 2:11"],
  },
  {
    id: "dikaiosyne",
    lemma: "δικαιοσύνη",
    transliteration: "dikaiosynē",
    strong: "G1343",
    glosses: ["righteousness", "justice"],
    occurrences: ["Matthew 6:33", "Romans 3:22", "2 Corinthians 5:21"],
  },
  {
    id: "soteria",
    lemma: "σωτηρία",
    transliteration: "sōtēria",
    strong: "G4991",
    glosses: ["salvation", "deliverance", "rescue"],
    occurrences: ["Luke 2:30", "Acts 4:12", "Romans 1:16"],
  },
  {
    id: "zoe",
    lemma: "ζωή",
    transliteration: "zōē",
    strong: "G2222",
    glosses: ["life", "living", "eternal life"],
    occurrences: ["John 1:4", "John 3:16", "John 10:10"],
  },
  {
    id: "eirene",
    lemma: "εἰρήνη",
    transliteration: "eirēnē",
    strong: "G1515",
    glosses: ["peace", "wholeness", "rest"],
    occurrences: ["John 14:27", "Romans 5:1", "Philippians 4:7"],
  },
  {
    id: "homologeo",
    lemma: "ὁμολογέω",
    transliteration: "homologeō",
    strong: "G3670",
    glosses: ["confess", "profess", "agree", "acknowledge"],
    occurrences: ["Romans 10:9", "1 John 1:9", "Hebrews 13:15"],
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

