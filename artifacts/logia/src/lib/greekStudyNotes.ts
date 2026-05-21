export type GreekStudyNote = {
  id: string;
  lemmaIds: string[];
  title: string;
  explanation: string;
  relatedWords: string[];
  sources: string[];
  status: "needs-review" | "approved";
};

export const GREEK_STUDY_NOTES: GreekStudyNote[] = [
  {
    id: "greek-love-words",
    lemmaIds: ["agapao", "phileo"],
    title: "Greek words for love",
    explanation:
      "Agapaō is often discussed as intentional or self-giving love, while phileō is often associated with affection or friendship. This distinction can be helpful, but it should be reviewed carefully because Greek usage can overlap by context.",
    relatedWords: ["ἀγαπάω", "φιλέω", "ἔρως", "στοργή"],
    sources: [],
    status: "needs-review",
  },
];

export function findGreekStudyNotes(lemmaIds: string[]) {
  return GREEK_STUDY_NOTES.filter((note) =>
    note.lemmaIds.some((id) => lemmaIds.includes(id)),
  );
}