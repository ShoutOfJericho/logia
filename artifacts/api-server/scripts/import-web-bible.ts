import fs from "node:fs/promises";
import path from "node:path";

const BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
  "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah",
  "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke",
  "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
  "Galatians", "Ephesians", "Philippians", "Colossians",
  "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
  "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
  "1 John", "2 John", "3 John", "Jude", "Revelation",
];

const CHAPTER_COUNTS: Record<string, number> = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34,
  Joshua: 24, Judges: 21, Ruth: 4, "1 Samuel": 31, "2 Samuel": 24,
  "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36,
  Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150, Proverbs: 31,
  Ecclesiastes: 12, "Song of Solomon": 8, Isaiah: 66, Jeremiah: 52,
  Lamentations: 5, Ezekiel: 48, Daniel: 12, Hosea: 14, Joel: 3, Amos: 9,
  Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3, Habakkuk: 3, Zephaniah: 3,
  Haggai: 2, Zechariah: 14, Malachi: 4, Matthew: 28, Mark: 16, Luke: 24,
  John: 21, Acts: 28, Romans: 16, "1 Corinthians": 16, "2 Corinthians": 13,
  Galatians: 6, Ephesians: 6, Philippians: 4, Colossians: 4,
  "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6,
  "2 Timothy": 4, Titus: 3, Philemon: 1, Hebrews: 13, James: 5,
  "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1, "3 John": 1,
  Jude: 1, Revelation: 22,
};

function constName(book: string) {
  return book.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function fileName(book: string) {
  return book.replace(/[^A-Za-z0-9]+/g, "");
}

async function fetchChapter(book: string, chapter: number) {
  const ref = encodeURIComponent(`${book} ${chapter}`);
  const url = `https://bible-api.com/${ref}?translation=web`;

  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url);

    if (res.status === 429) {
      console.log(`Rate limited on ${book} ${chapter}; waiting...`);
      await new Promise((r) => setTimeout(r, 10000 * attempt));
      continue;
    }

    if (!res.ok) throw new Error(`${book} ${chapter} failed: ${res.status}`);

    const json = await res.json();

    return (json.verses ?? []).map((v: any) => ({
      book,
      chapter,
      verse: v.verse,
      text: String(v.text ?? "").trim(),
    }));
  }

  throw new Error(`${book} ${chapter} failed after retries`);
}

async function main() {
  const outDir = path.resolve("artifacts/api-server/src/data/bible/web");
  await fs.mkdir(outDir, { recursive: true });

  const imports: string[] = [];
  const spreads: string[] = [];

  for (const book of BOOKS) {
    const rows: any[] = [];
    const chapters = CHAPTER_COUNTS[book];

    for (let chapter = 1; chapter <= chapters; chapter++) {
      console.log(`Fetching ${book} ${chapter}`);
      rows.push(...await fetchChapter(book, chapter));
      await new Promise((r) => setTimeout(r, 1200));
    }

    const name = constName(book);
    const file = fileName(book);

    const content = `import type { LocalBibleVerse } from "./types";

export const ${name}: LocalBibleVerse[] = ${JSON.stringify(rows, null, 2)};
`;

    await fs.writeFile(path.join(outDir, `${file}.ts`), content, "utf8");

    imports.push(`import { ${name} } from "./${file}";`);
    spreads.push(`  ${JSON.stringify(book)}: ${name},`);
  }

  const index = `${imports.join("\n")}
import type { LocalBibleVerse } from "./types";

export type { LocalBibleVerse } from "./types";

export const WEB_BIBLE_BY_BOOK: Record<string, LocalBibleVerse[]> = {
${spreads.join("\n")}
};
`;

  await fs.writeFile(path.join(outDir, "index.ts"), index, "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});