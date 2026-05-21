import { GENESIS } from "./Genesis";
import { EXODUS } from "./Exodus";
import { LEVITICUS } from "./Leviticus";
import { NUMBERS } from "./Numbers";
import { DEUTERONOMY } from "./Deuteronomy";
import { JOSHUA } from "./Joshua";
import { JUDGES } from "./Judges";
import { RUTH } from "./Ruth";
import { FIRST_SAMUEL } from "./1Samuel";
import { SECOND_SAMUEL } from "./2Samuel";
import { FIRST_KINGS } from "./1Kings";
import { SECOND_KINGS } from "./2Kings";
import { FIRST_CHRONICLES } from "./1Chronicles";
import { SECOND_CHRONICLES } from "./2Chronicles";
import { EZRA } from "./Ezra";
import { NEHEMIAH } from "./Nehemiah";
import { ESTHER } from "./Esther";
import { JOB } from "./Job";
import { PSALMS } from "./Psalms";
import { PROVERBS } from "./Proverbs";
import { ECCLESIASTES } from "./Ecclesiastes";
import { SONG_OF_SOLOMON } from "./SongofSolomon";
import { ISAIAH } from "./Isaiah";
import { JEREMIAH } from "./Jeremiah";
import { LAMENTATIONS } from "./Lamentations";
import { EZEKIEL } from "./Ezekiel";
import { DANIEL } from "./Daniel";
import { HOSEA } from "./Hosea";
import { JOEL } from "./Joel";
import { AMOS } from "./Amos";
import { OBADIAH } from "./Obadiah";
import { JONAH } from "./Jonah";
import { MICAH } from "./Micah";
import { NAHUM } from "./Nahum";
import { HABAKKUK } from "./Habakkuk";
import { ZEPHANIAH } from "./Zephaniah";
import { HAGGAI } from "./Haggai";
import { ZECHARIAH } from "./Zechariah";
import { MALACHI } from "./Malachi";
import { MATTHEW } from "./Matthew";
import { MARK } from "./Mark";
import { LUKE } from "./Luke";
import { JOHN } from "./John";
import { ACTS } from "./Acts";
import { ROMANS } from "./Romans";
import { FIRST_CORINTHIANS } from "./1Corinthians";
import { SECOND_CORINTHIANS } from "./2Corinthians";
import { GALATIANS } from "./Galatians";
import { EPHESIANS } from "./Ephesians";
import { PHILIPPIANS } from "./Philippians";
import { COLOSSIANS } from "./Colossians";
import { FIRST_THESSALONIANS } from "./1Thessalonians";
import { SECOND_THESSALONIANS } from "./2Thessalonians";
import { FIRST_TIMOTHY } from "./1Timothy";
import { SECOND_TIMOTHY } from "./2Timothy";
import { TITUS } from "./Titus";
import { PHILEMON } from "./Philemon";
import { HEBREWS } from "./Hebrews";
import { JAMES } from "./James";
import { FIRST_PETER } from "./1Peter";
import { SECOND_PETER } from "./2Peter";
import { FIRST_JOHN } from "./1John";
import { SECOND_JOHN } from "./2John";
import { THIRD_JOHN } from "./3John";
import { JUDE } from "./Jude";
import { REVELATION } from "./Revelation";
import type { LocalBibleVerse } from "./types";

export type { LocalBibleVerse } from "./types";

export const WEB_BIBLE_BY_BOOK: Record<string, LocalBibleVerse[]> = {
    "Genesis": GENESIS,
    "Exodus": EXODUS,
    "Leviticus": LEVITICUS,
    "Numbers": NUMBERS,
    "Deuteronomy": DEUTERONOMY,
    "Joshua": JOSHUA,
    "Judges": JUDGES,
    "Ruth": RUTH,
    "1 Samuel": FIRST_SAMUEL,
    "2 Samuel": SECOND_SAMUEL,
    "1 Kings": FIRST_KINGS,
    "2 Kings": SECOND_KINGS,
    "1 Chronicles": FIRST_CHRONICLES,
    "2 Chronicles": SECOND_CHRONICLES,
    "Ezra": EZRA,
    "Nehemiah": NEHEMIAH,
    "Esther": ESTHER,
    "Job": JOB,
    "Psalms": PSALMS,
    "Proverbs": PROVERBS,
    "Ecclesiastes": ECCLESIASTES,
    "Song of Solomon": SONG_OF_SOLOMON,
    "Isaiah": ISAIAH,
    "Jeremiah": JEREMIAH,
    "Lamentations": LAMENTATIONS,
    "Ezekiel": EZEKIEL,
    "Daniel": DANIEL,
    "Hosea": HOSEA,
    "Joel": JOEL,
    "Amos": AMOS,
    "Obadiah": OBADIAH,
    "Jonah": JONAH,
    "Micah": MICAH,
    "Nahum": NAHUM,
    "Habakkuk": HABAKKUK,
    "Zephaniah": ZEPHANIAH,
    "Haggai": HAGGAI,
    "Zechariah": ZECHARIAH,
    "Malachi": MALACHI,
    "Matthew": MATTHEW,
    "Mark": MARK,
    "Luke": LUKE,
    "John": JOHN,
    "Acts": ACTS,
    "Romans": ROMANS,
    "1 Corinthians": FIRST_CORINTHIANS,
    "2 Corinthians": SECOND_CORINTHIANS,
    "Galatians": GALATIANS,
    "Ephesians": EPHESIANS,
    "Philippians": PHILIPPIANS,
    "Colossians": COLOSSIANS,
    "1 Thessalonians": FIRST_THESSALONIANS,
    "2 Thessalonians": SECOND_THESSALONIANS,
    "1 Timothy": FIRST_TIMOTHY,
    "2 Timothy": SECOND_TIMOTHY,
    "Titus": TITUS,
    "Philemon": PHILEMON,
    "Hebrews": HEBREWS,
    "James": JAMES,
    "1 Peter": FIRST_PETER,
    "2 Peter": SECOND_PETER,
    "1 John": FIRST_JOHN,
    "2 John": SECOND_JOHN,
    "3 John": THIRD_JOHN,
    "Jude": JUDE,
    "Revelation": REVELATION,
};
