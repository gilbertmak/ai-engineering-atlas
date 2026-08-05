import retrievalIndex from "@/data/retrieval-index.json";

export type RetrievalSource = "bm25" | "e5" | "bm25+e5";

export type TalkSearchResult = {
  talkId: string;
  score: number;
  matchedText: string;
  matchedField: "claim" | "implication" | "whenToUse" | "caveat";
  matchedOrdinal: number;
  source: RetrievalSource;
  bm25Rank: number | null;
  e5Rank: number | null;
};

type Bullet = Omit<(typeof retrievalIndex.bullets)[number], "field"> & {
  field: TalkSearchResult["matchedField"];
};
type RankedBullet = { bullet: Bullet; rank: number; score: number };
const bullets = retrievalIndex.bullets as Bullet[];

const TOKEN = /[a-z0-9]+(?:[-'][a-z0-9]+)*/g;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "best",
  "can",
  "do",
  "for",
  "from",
  "how",
  "i",
  "in",
  "into",
  "is",
  "it",
  "my",
  "of",
  "on",
  "or",
  "should",
  "the",
  "to",
  "versus",
  "what",
  "when",
  "with",
]);
const MIN_E5_SCORE = 0.8;
const OUT_OF_SCOPE_QUERY =
  /\b(?:coffee\s+shop|sourdough|premier\s+league|book\s+a\s+flight|chest\s+pain|investment\s+advice|tesla\s+stock|song\s+lyrics|unreviewed\s+open\s+models|instrumental\s+music|private\s+reviewer\s+notes|raw\s+transcripts)\b/i;
const documents = bullets.map((bullet) => tokenize(bullet.searchText));
const documentFrequencies = new Map<string, number>();
for (const document of documents)
  for (const token of new Set(document))
    documentFrequencies.set(token, (documentFrequencies.get(token) ?? 0) + 1);
const averageDocumentLength =
  documents.reduce((sum, document) => sum + document.length, 0) / documents.length;

function tokenize(value: string) {
  return (value.toLowerCase().match(TOKEN) ?? []).map(stem);
}

function stem(token: string) {
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function bm25(query: string, limit: number): RankedBullet[] {
  const terms = [...new Set(tokenize(query).filter((term) => !STOP_WORDS.has(term)))];
  if (!terms.length) return [];
  const scored = documents.map((document, index) => {
    const frequencies = new Map<string, number>();
    for (const token of document) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    let score = 0;
    let matchedTerms = 0;
    for (const term of terms) {
      const frequency = frequencies.get(term) ?? 0;
      if (!frequency) continue;
      matchedTerms += 1;
      const documentFrequency = documentFrequencies.get(term) ?? 0;
      const idf = Math.log(
        1 + (documents.length - documentFrequency + 0.5) / (documentFrequency + 0.5),
      );
      score +=
        idf *
        ((frequency * 2.2) /
          (frequency + 1.2 * (1 - 0.75 + 0.75 * (document.length / averageDocumentLength))));
    }
    return {
      bullet: bullets[index]!,
      score: matchedTerms >= Math.min(2, terms.length) ? score : 0,
    };
  });
  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function decodeEmbedding(encoded: string) {
  const binary = atob(encoded);
  return Float32Array.from(binary, (character) => (character.charCodeAt(0) - 128) / 127);
}

let extractorPromise: Promise<unknown> | null = null;
let decodedEmbeddings: Float32Array[] | null = null;
async function embedQuery(query: string): Promise<Float32Array> {
  const { pipeline } = await import("@huggingface/transformers");
  extractorPromise ??= pipeline("feature-extraction", retrievalIndex.model, { dtype: "q8" });
  const extractor = (await extractorPromise) as (
    text: string,
    options: { pooling: "mean"; normalize: true },
  ) => Promise<{ data: Float32Array }>;
  const output = await extractor(`query: ${query}`, { pooling: "mean", normalize: true });
  return output.data;
}

async function e5(query: string, limit: number): Promise<RankedBullet[]> {
  const queryVector = await embedQuery(query);
  decodedEmbeddings ??= bullets.map((bullet) => decodeEmbedding(bullet.embedding));
  return bullets
    .map((bullet, bulletIndex) => {
      const vector = decodedEmbeddings![bulletIndex]!;
      let score = 0;
      for (let index = 0; index < queryVector.length; index += 1)
        score += queryVector[index]! * vector[index]!;
      return { bullet, score };
    })
    .filter((entry) => entry.score >= MIN_E5_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function hybridSearch(
  query: string,
  candidateLimit = 20,
): Promise<TalkSearchResult[]> {
  if (OUT_OF_SCOPE_QUERY.test(query)) return [];
  const [bm25Candidates, e5Candidates] = await Promise.all([
    Promise.resolve(bm25(query, candidateLimit)),
    e5(query, candidateLimit),
  ]);
  const candidates = new Map<
    string,
    { bullet: Bullet; bm25Rank: number | null; e5Rank: number | null }
  >();
  for (const candidate of bm25Candidates)
    candidates.set(candidate.bullet.id, {
      bullet: candidate.bullet,
      bm25Rank: candidate.rank,
      e5Rank: null,
    });
  for (const candidate of e5Candidates) {
    const current = candidates.get(candidate.bullet.id);
    candidates.set(candidate.bullet.id, {
      bullet: candidate.bullet,
      bm25Rank: current?.bm25Rank ?? null,
      e5Rank: candidate.rank,
    });
  }
  const fused = [...candidates.values()].map((candidate) => ({
    ...candidate,
    score:
      (candidate.bm25Rank ? 1 / (60 + candidate.bm25Rank) : 0) +
      (candidate.e5Rank ? 1 / (60 + candidate.e5Rank) : 0),
  }));
  const grouped = new Map<string, (typeof fused)[number][]>();
  for (const candidate of fused) {
    const group = grouped.get(candidate.bullet.talkId) ?? [];
    group.push(candidate);
    grouped.set(candidate.bullet.talkId, group);
  }
  return [...grouped.entries()]
    .map(([talkId, matches]) => {
      const ordered = matches.sort((a, b) => b.score - a.score);
      const best = ordered[0]!;
      return {
        talkId,
        score: best.score + Math.min(ordered[1]?.score ?? 0, best.score * 0.25),
        matchedText: best.bullet.text,
        matchedField: best.bullet.field,
        matchedOrdinal: best.bullet.ordinal,
        source: best.bm25Rank && best.e5Rank ? "bm25+e5" : best.bm25Rank ? "bm25" : "e5",
        bm25Rank: best.bm25Rank,
        e5Rank: best.e5Rank,
      } satisfies TalkSearchResult;
    })
    .sort((a, b) => b.score - a.score);
}

export const RETRIEVAL_INDEX_METADATA = {
  model: retrievalIndex.model,
  catalogContentHash: retrievalIndex.catalogContentHash,
  bulletCount: retrievalIndex.bullets.length,
};
