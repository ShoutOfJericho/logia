export type LexicalCandidate = {
    id: string;
    language: "greek" | "hebrew" | "aramaic";
    lemma: string;
    transliteration?: string;
    strong?: string;
    glosses: string[];
    occurrences: string[];
    status: "needs-review" | "approved" | "rejected";
  };
  
  export const GREEK_LEXICAL_CANDIDATES: LexicalCandidate[] = [];