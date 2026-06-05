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
  {
    id: "logos-word-reason",
    lemmaIds: ["logos", "homologeo"],
    title: "Logos, speech, and confession",
    explanation:
      "Logos can mean word, speech, message, reason, or expressed thought. In John 1, it is used in a uniquely Christ-centered way. Homologeō is related to the idea of saying the same thing or agreeing/confessing, which can help readers connect speech, confession, and truth.",
    relatedWords: ["λόγος", "ὁμολογέω", "λέγω"],
    sources: [
      "https://biblehub.com/greek/3056.htm",
      "https://biblehub.com/greek/3670.htm",
    ],
    status: "needs-review",
  },
  {
    id: "grace-faith-salvation",
    lemmaIds: ["charis", "pistis", "soteria"],
    title: "Grace, faith, and salvation language",
    explanation:
      "Charis is commonly translated grace or favor, pistis as faith or trust, and sōtēria as salvation or deliverance. These words often appear together in passages about God's saving work and the believer's response.",
    relatedWords: ["χάρις", "πίστις", "σωτηρία"],
    sources: [],
    status: "needs-review",
  },
  {
    id: "sin-righteousness-life",
    lemmaIds: ["hamartia", "dikaiosyne", "zoe"],
    title: "Sin, righteousness, and life",
    explanation:
      "Hamartia is commonly translated sin, dikaiosynē as righteousness or justice, and zōē as life. These words frequently shape New Testament teaching about humanity's condition, God's righteousness, and life in Christ.",
    relatedWords: ["ἁμαρτία", "δικαιοσύνη", "ζωή"],
    sources: [],
    status: "needs-review",
  },
  {
    id: "greek-peace",
    lemmaIds: ["eirene"],
    title: "Eirēnē and peace",
    explanation:
      "Eirēnē is commonly translated peace. In New Testament contexts, it can refer not merely to calm feelings but to peace with God, restored relationship, and wholeness.",
    relatedWords: ["εἰρήνη"],
    sources: [],
    status: "needs-review",
  },
];

export function findGreekStudyNotes(lemmaIds: string[]) {
  return GREEK_STUDY_NOTES.filter((note) =>
    note.lemmaIds.some((id) => lemmaIds.includes(id)),
  );
}