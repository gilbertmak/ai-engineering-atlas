import { ATLAS_CATALOG_MANIFEST, LAST_KNOWN_GOOD_CATALOG } from "@/lib/atlas-catalog";
import { parseNumberedInsightText, splitInsightSentences } from "@/lib/insight-formatting";
import { talkInsightForVideo } from "@/data/talk-insights";
import { type InsightField } from "@/lib/pinecone-contract";

export type PineconeInsightRecord = {
  _id: string;
  text: string;
  talk_id: string;
  field: InsightField;
  ordinal: number;
  catalog_content_hash: string;
};

const FIELDS: readonly InsightField[] = ["claim", "implication", "whenToUse", "caveat"];

function bulletsForInsightField(value: string): string[] {
  const numbered = parseNumberedInsightText(value);
  const source = numbered.points.length ? [numbered.lead, ...numbered.points] : [value];
  return source.flatMap((part) => splitInsightSentences(part)).filter(Boolean);
}

export function buildPineconeInsightRecords(): PineconeInsightRecord[] {
  return LAST_KNOWN_GOOD_CATALOG.flatMap((video) => {
    if (video.insightReviewStatus !== "approved") return [];
    const insight = talkInsightForVideo(video);
    if (!insight) return [];

    return FIELDS.flatMap((field) =>
      bulletsForInsightField(insight[field]).map((text, ordinal) => ({
        _id: `${video.id}:${field}:${ordinal}`,
        text,
        talk_id: video.id,
        field,
        ordinal,
        catalog_content_hash: ATLAS_CATALOG_MANIFEST.contentHash,
      })),
    );
  });
}
