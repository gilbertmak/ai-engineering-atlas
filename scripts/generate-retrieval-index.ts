import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { pipeline } from "@huggingface/transformers";

import publicCatalog from "../src/data/atlas-public-catalog.json";
import { atlasTagLabel } from "../src/data/catalog-taxonomy";
import { talkInsightForVideo, type TalkInsight } from "../src/data/talk-insights";
import { parseNumberedInsightText, splitInsightSentences } from "../src/lib/insight-formatting";

const MODEL = "Xenova/e5-small-v2";
const BATCH_SIZE = 32;

type IndexedField = "claim" | "implication" | "whenToUse" | "caveat";

function fieldBullets(insight: TalkInsight, field: IndexedField): string[] {
  const value = insight[field];
  const numbered = parseNumberedInsightText(value);
  if (numbered.points.length)
    return [...(numbered.lead ? [numbered.lead] : []), ...numbered.points];
  return splitInsightSentences(value);
}

const bullets = publicCatalog.records.flatMap((video) => {
  if (video.insightReviewStatus !== "approved") return [];
  const insight = talkInsightForVideo(video);
  if (!insight || insight.contentBasis === "metadata_only") return [];
  const metadata = `${video.title} ${video.sourceChannel} ${(video.themes ?? []).join(" ")} ${(
    video.tags ?? []
  )
    .map(atlasTagLabel)
    .join(" ")}`;
  return (["claim", "implication", "whenToUse", "caveat"] as const).flatMap((field) =>
    fieldBullets(insight, field).map((text, ordinal) => ({
      id: `${video.id}:${field}:${ordinal}`,
      talkId: video.id,
      field,
      ordinal,
      text,
      searchText: `${metadata} ${text}`,
      contentBasis: insight.contentBasis,
    })),
  );
});

const embed = await pipeline("feature-extraction", MODEL, { dtype: "q8" });
const encoded: string[] = [];
for (let start = 0; start < bullets.length; start += BATCH_SIZE) {
  const batch = bullets.slice(start, start + BATCH_SIZE);
  const output = await embed(
    batch.map((bullet) => `passage: ${bullet.searchText}`),
    { pooling: "mean", normalize: true },
  );
  const values = output.tolist() as number[][];
  for (const vector of values) {
    const quantized = Uint8Array.from(vector, (value) =>
      Math.max(0, Math.min(255, Math.round(value * 127) + 128)),
    );
    encoded.push(Buffer.from(quantized).toString("base64"));
  }
  console.log(`Embedded ${Math.min(start + BATCH_SIZE, bullets.length)} / ${bullets.length}`);
}

writeFileSync(
  join(process.cwd(), "src/data/retrieval-index.json"),
  `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    catalogContentHash: publicCatalog.manifest.contentHash,
    model: MODEL,
    dimensions: 384,
    quantization: "symmetric-int8-base64-offset128",
    bullets: bullets.map((bullet, index) => ({ ...bullet, embedding: encoded[index] })),
  })}\n`,
);
