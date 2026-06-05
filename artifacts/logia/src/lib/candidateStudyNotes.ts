export type CandidateStudyNote = {
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
    evidenceRefs?: string[];
    keywords: string[];
    status: "needs-review" | "approved" | "rejected";
    reviewerNotes?: string;
  };
  
  export const CANDIDATE_STUDY_NOTES: CandidateStudyNote[] = [];