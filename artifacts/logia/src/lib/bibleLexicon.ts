// Phonetic transcript correction for biblical proper nouns.
//
// Strategy: for every word in a transcript, compute a cheap phonetic key
// (simplified Metaphone). If the word also looks unfamiliar (not in a tiny
// stoplist of common English words), compare its phonetic key against
// precomputed keys for every name in the lexicon using Jaro-Winkler
// similarity. If the best match exceeds a threshold, replace the word with
// the canonical biblical name.
//
// All work is local; no network calls beyond loading the lexicon once.

const COMMON_WORDS = new Set([
  "the", "and", "for", "but", "with", "from", "this", "that", "into", "unto",
  "have", "your", "their", "they", "them", "him", "her", "his", "she", "you",
  "what", "when", "where", "while", "shall", "will", "who", "whom", "which",
  "would", "could", "should", "about", "after", "before", "again", "ever",
  "every", "some", "such", "than", "then", "there", "these", "those", "very",
  "thus", "yet", "also", "even", "ought", "more", "most", "many", "much",
  "other", "another", "between", "through", "until", "upon", "without",
  "though", "because", "while", "however", "both", "either", "neither",
  "verse", "chapter", "amen", "selah", "lord", "god", "father", "son", "spirit",
  "jesus", "christ", "king", "queen", "prophet", "priest", "people", "men",
  "women", "child", "children", "blessed", "righteous", "wicked", "holy",
  "love", "glory", "praise", "covenant", "kingdom", "sin", "grace", "faith",
  "life", "death", "house", "land", "city", "earth", "heaven", "way", "word",
  "really", "important", "amazing", "powerful", "interesting", "crucial",
  "thing", "things", "right", "wrong", "good", "bad", "true", "false",
  "actually", "basically", "literally", "honestly", "okay", "yeah", "yes", "no",
]);

let lexiconReady: { names: string[]; keyed: Map<string, string[]>; ahaPatterns: RegExp[] } | null = null;

export function initLexicon(names: string[], ahaPatterns: string[]): void {
  const keyed = new Map<string, string[]>();
  for (const name of names) {
    const key = metaphone(name);
    if (!key) continue;
    const list = keyed.get(key) ?? [];
    list.push(name);
    keyed.set(key, list);
  }
  const compiledAha = ahaPatterns.map(
    (p) =>
      new RegExp(
        `\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}\\b`,
        "i",
      ),
  );
  lexiconReady = { names, keyed, ahaPatterns: compiledAha };
}

export function isLexiconReady(): boolean {
  return lexiconReady !== null;
}

/** Apply Bible-name correction to a transcript chunk. Idempotent and cheap. */
export function correctTranscript(text: string): string {
  if (!lexiconReady || !text) return text;
  const { keyed } = lexiconReady;
  return text.replace(/[A-Za-z][A-Za-z'-]+/g, (token) => {
    if (token.length < 4) return token;
    const lower = token.toLowerCase();
    if (COMMON_WORDS.has(lower)) return token;

    const key = metaphone(token);
    if (!key) return token;

    // Direct phonetic-key bucket match — pick the closest by Jaro-Winkler on raw text
    const candidates = keyed.get(key) ?? [];
    let best: { name: string; score: number } | null = null;

    for (const name of candidates) {
      const score = jaroWinkler(lower, name.toLowerCase());
      if (!best || score > best.score) best = { name, score };
    }

    // Fallback: scan neighboring keys (1-character key edit) only if no exact bucket
    if (!best || best.score < 0.86) {
      for (const [k, list] of keyed) {
        if (Math.abs(k.length - key.length) > 1) continue;
        if (k === key) continue;
        if (levenshteinKeyDistance(k, key) > 1) continue;
        for (const name of list) {
          const score = jaroWinkler(lower, name.toLowerCase()) - 0.04;
          if (!best || score > best.score) best = { name, score };
        }
      }
    }

const hasBibleContext =
  /\b(chapter|verse|\d+:\d+|jesus|lord|god|israel)\b/i.test(text);

if (best && best.score >= (hasBibleContext ? 0.86 : 0.93)) {
  console.log("BIBLE CORRECTION", {
    original: token,
    corrected: best.name,
    score: best.score,
    context: text,
  });

  // Preserve original capitalization style
  const isCap = /^[A-Z]/.test(token);

  return isCap ? best.name : best.name.toLowerCase();
}

return token;

  });
}

/** Detect aha patterns in text. Returns the matched phrase, or null. */
export function detectAhaPhrase(text: string): string | null {
  if (!lexiconReady) return null;
  for (const re of lexiconReady.ahaPatterns) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Phonetic helpers
// ---------------------------------------------------------------------------

/** Simplified, cheap Metaphone-ish encoder. Good enough for English-rendered Hebrew/Greek names. */
function metaphone(input: string): string {
  let s = input.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return "";

  // Keep first letter, even if vowel
  const first = s[0];

  // Common digraph normalizations
  s = s
    .replace(/PH/g, "F")
    .replace(/CH/g, "K")
    .replace(/SH/g, "X")
    .replace(/TH/g, "0")
    .replace(/CK/g, "K")
    .replace(/QU/g, "K")
    .replace(/Q/g, "K")
    .replace(/X/g, "KS")
    .replace(/KN/g, "N")
    .replace(/GN/g, "N")
    .replace(/PN/g, "N")
    .replace(/WR/g, "R")
    .replace(/PS/g, "S")
    .replace(/MB$/g, "M")
    .replace(/Y/g, "I");

  // Drop vowels except the first
  let body = s
    .slice(1)
    .replace(/[AEIOU]/g, "");

  // Collapse doubled consonants
  body = body.replace(/(.)\1+/g, "$1");

  // Replace softer C's with S; harder ones with K
  body = body.replace(/C/g, "K");

  return (first + body).slice(0, 8);
}

function levenshteinKeyDistance(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const dp = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) dp[j] = j;
  for (let i = 1; i <= al; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= bl; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[bl];
}

function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  const al = a.length;
  const bl = b.length;
  if (al === 0 || bl === 0) return 0;
  const matchDistance = Math.max(al, bl) >> 1;
  const aMatches = new Array<boolean>(al).fill(false);
  const bMatches = new Array<boolean>(bl).fill(false);
  let matches = 0;
  for (let i = 0; i < al; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, bl);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < al; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  t /= 2;
  const m = matches;
  const jaro = (m / al + m / bl + (m - t) / m) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, al, bl); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}
