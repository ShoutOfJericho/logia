import { Router, type IRouter } from "express";
import { GetLexiconResponse } from "@workspace/api-zod";
import { BIBLE_NAMES, AHA_PATTERNS } from "../lib/bibleNames";

const router: IRouter = Router();

router.get("/lexicon", (_req, res) => {
  const data = GetLexiconResponse.parse({
    names: [...BIBLE_NAMES],
    ahaPatterns: [...AHA_PATTERNS],
  });
  res.json(data);
});

export default router;
