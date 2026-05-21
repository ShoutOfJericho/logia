import { Router, type IRouter } from "express";
import { GetPassageParams, GetPassageResponse } from "@workspace/api-zod";
import { WEB_BIBLE_BY_BOOK } from "../data/bible/web/index";

const router: IRouter = Router();

interface BibleApiVerse {
  book_id?: string;
  book_name?: string;
  chapter?: number;
  verse?: number;
  text?: string;
}

interface BibleApiResponse {
  reference?: string;
  verses?: BibleApiVerse[];
  text?: string;
  translation_id?: string;
  translation_name?: string;
  translation_note?: string;
}

router.get("/passages/:book/:chapter", async (req, res) => {
  const book = String(req.params.book ?? "").trim();
  const chapter = Number(req.params.chapter);

  if (!book || !Number.isFinite(chapter) || chapter < 1) {
    res.status(400).json({ error: "Invalid book or chapter" });
    return;
  }

  const localBookKey = Object.keys(WEB_BIBLE_BY_BOOK).find(
    (key) => key.toLowerCase() === book.toLowerCase(),
  );

  const localVerses = localBookKey
    ? WEB_BIBLE_BY_BOOK[localBookKey]
        .filter((v) => v.chapter === chapter)
        .map((v) => ({
          verse: v.verse,
          text: v.text,
        }))
    : [];

console.log("LOCAL VERSES FOUND", {
  book,
  chapter,
  count: localVerses.length,
  localBookKey,
});

  if (localVerses.length > 0) {
    const data = GetPassageResponse.parse({
      book,
      chapter,
      translation: "World English Bible",
      verses: localVerses,
    });

    res.json(data);
    return;
  }

  const reference = encodeURIComponent(`${book} ${chapter}`);
  const url = `https://bible-api.com/${reference}?translation=web`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      req.log.warn(
        { status: upstream.status, book, chapter },
        "bible-api lookup failed",
      );
      res.status(404).json({ error: "Passage not found" });
      return;
    }
    const json = (await upstream.json()) as BibleApiResponse;
    const verses = (json.verses ?? [])
      .map((v) => ({
        verse: typeof v.verse === "number" ? v.verse : 0,
        text: typeof v.text === "string" ? v.text.trim() : "",
      }))
      .filter((v) => v.verse > 0 && v.text.length > 0);

    if (verses.length === 0) {
      res.status(404).json({ error: "Passage not found" });
      return;
    }

    const data = GetPassageResponse.parse({
      book: json.verses?.[0]?.book_name ?? book,
      chapter,
      translation: json.translation_name ?? "World English Bible",
      verses,
    });
    res.json(data);
  } catch (err) {
    req.log.error({ err, book, chapter }, "bible-api request failed");
    res.status(502).json({ error: "Upstream Bible service unavailable" });
  }
});

export default router;
