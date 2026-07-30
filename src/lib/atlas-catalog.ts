import { z } from "zod";

import {
  SOURCE_CATALOG_VERIFIED_AT,
  VIDEOS,
  videoThemes,
  type Track,
  type Video,
} from "@/data/videos";

export const ATLAS_PROJECTION_VERSION = "atlas-transcript-projection-2026-07-28.1";
export const ATLAS_CONTENT_SCOPE = "reviewed_source_metadata_only" as const;

export const themeSchema = z.enum([
  "System Design",
  "Data & Eval",
  "Reliability",
  "Observability",
  "Safety & Control",
  "Deployment",
]);
const isoDate = z.string().datetime({ offset: true });
const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const themesSchema = z
  .array(themeSchema)
  .max(6)
  .superRefine((value, context) => {
    if (new Set(value).size !== value.length)
      context.addIssue({ code: z.ZodIssueCode.custom, message: "themes must be unique" });
  });

export const themeClassificationSchema = z
  .object({
    source: z.enum(["approved_local_metadata", "approved_local_transcript"]),
    basis: z.enum(["metadata_review", "transcript_evidence_review"]),
    reviewedAt: isoDate,
    reviewerVersion: z.string().min(1).max(120),
  })
  .strict();

export const transcriptSchema = z
  .object({
    status: z.enum([
      "not_requested",
      "acquired",
      "unavailable",
      "restricted",
      "failed",
      "stale",
      "superseded",
    ]),
    availability: z.enum(["available", "unavailable", "restricted", "unknown"]),
    sourceUrl: z
      .string()
      .url()
      .refine(
        (url) => url.startsWith("https://www.youtube.com/") || url.startsWith("https://youtu.be/"),
        "sourceUrl must be a canonical public video URL",
      ),
    provider: z.string().min(1).max(120),
    sourceType: z.enum(["youtube_caption", "approved_transcript"]),
    retrievedAt: isoDate,
    acquisitionRunId: z.string().min(1).max(120),
    locale: z.string().min(2).max(35),
    sourceVersion: z.string().min(1).max(160),
    availabilityCheckedAt: isoDate,
    termsBasis: z.string().min(1).max(240),
    rightsBasis: z.string().min(1).max(240),
    redistributionAllowed: z.boolean(),
    attributionRequired: z.boolean(),
    reviewedAt: isoDate.nullable(),
    digest: digestSchema,
    reviewStatus: z.enum(["approved", "pending", "rejected"]),
    attributionEligible: z.boolean(),
  })
  .strict();

export const transcriptEvidenceSchema = z
  .object({
    evidenceId: z.string().min(1).max(120),
    videoId: z.string().min(1),
    text: z.string().min(1).max(1_000), // approved paraphrase/excerpt only, never raw transcript
    timestampSeconds: z.number().int().nonnegative(),
    transcriptDigest: digestSchema,
    status: z.enum(["approved", "retracted", "superseded"]),
    reviewedAt: isoDate,
    reviewerVersion: z.string().min(1).max(120),
    speaker: z.string().min(1).max(160).nullable(),
    speakerAttributionEligible: z.boolean(),
  })
  .strict()
  .superRefine((evidence, context) => {
    if (evidence.speakerAttributionEligible !== Boolean(evidence.speaker))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "speaker attribution must be explicit and eligible",
      });
  });

export const catalogVideoSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    title: z.string().min(1),
    sourceChannel: z.string().min(1),
    // Kept only while metadata publication still emits legacy migration fields.
    track: themeSchema.nullable(),
    tracks: themesSchema.default([]),
    themes: themesSchema.default([]),
    themeClassification: themeClassificationSchema.nullable().default(null),
    transcript: transcriptSchema.optional(),
    evidence: z.array(transcriptEvidenceSchema).default([]),
    publishedAt: isoDate,
    durationSeconds: z.number().int().positive(),
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    contentStatus: z
      .enum(["editorial_track_synthesis", "metadata_only"])
      .default("editorial_track_synthesis"),
  })
  .strict()
  .superRefine((record, context) => {
    const themes = record.themes.length
      ? record.themes
      : [...new Set([...record.tracks, ...(record.track ? [record.track] : [])])];
    if (record.themeClassification && !themes.length)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "theme classification requires a theme",
      });
    for (const [index, evidence] of record.evidence.entries()) {
      const transcript = record.transcript;
      if (
        !transcript ||
        evidence.videoId !== record.id ||
        evidence.transcriptDigest !== transcript.digest ||
        evidence.status !== "approved" ||
        transcript.status !== "acquired" ||
        transcript.availability !== "available" ||
        transcript.reviewStatus !== "approved" ||
        !transcript.reviewedAt ||
        !transcript.redistributionAllowed
      )
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidence", index],
          message: "evidence must match a current approved available transcript",
        });
    }
  });
export type CatalogVideo = z.infer<typeof catalogVideoSchema>;

export const catalogManifestSchema = z
  .object({
    projectionVersion: z.string().min(1),
    generatedAt: isoDate,
    sourceCatalogVerifiedAt: isoDate,
    contentScope: z.enum([ATLAS_CONTENT_SCOPE, "mixed_approved_metadata"]),
    publicationStatus: z.literal("published"),
    reviewStatus: z.enum(["reviewed", "mixed"]),
    recordCount: z.number().int().nonnegative(),
    contentHash: z.string().regex(/^fnv1a64:[a-f0-9]{16}$/),
    lastKnownGood: z.literal(true),
  })
  .strict();
export type CatalogManifest = z.infer<typeof catalogManifestSchema>;
export const catalogPageSchema = z
  .object({
    manifest: catalogManifestSchema,
    records: z.array(catalogVideoSchema),
    nextCursor: z.string().nullable(),
  })
  .strict();
export type CatalogPage = z.infer<typeof catalogPageSchema>;
export const catalogQuerySchema = z
  .object({
    theme: themeSchema.optional(),
    track: themeSchema.optional(),
    q: z.string().trim().max(120).optional(),
    cursor: z.string().min(1).max(120).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(24),
  })
  .strict();

function fnv1a64(value: string) {
  let hash = 0xcbf29ce484222325n;
  for (const char of value) {
    hash ^= BigInt(char.codePointAt(0) ?? 0);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}
function catalogFingerprint(records: readonly CatalogVideo[]) {
  return records
    .map((record) =>
      [
        record.id,
        record.code,
        record.title,
        record.sourceChannel,
        videoThemes(record).join(","),
        JSON.stringify(record.themeClassification),
        JSON.stringify(record.transcript),
        record.evidence.map((evidence) => JSON.stringify(evidence)).join(","),
        record.publishedAt,
        record.durationSeconds,
        record.youtubeId,
        record.contentStatus,
      ].join("\u001f"),
    )
    .join("\u001e");
}
const reviewedRecords = z.array(catalogVideoSchema).parse(
  VIDEOS.map((video) => ({
    ...video,
    themes: videoThemes(video),
    contentStatus: "editorial_track_synthesis",
  })),
);
export const LAST_KNOWN_GOOD_CATALOG: readonly CatalogVideo[] = reviewedRecords;
export const ATLAS_CATALOG_MANIFEST: CatalogManifest = catalogManifestSchema.parse({
  projectionVersion: ATLAS_PROJECTION_VERSION,
  generatedAt: "2026-07-28T00:00:00+08:00",
  sourceCatalogVerifiedAt: SOURCE_CATALOG_VERIFIED_AT,
  contentScope: ATLAS_CONTENT_SCOPE,
  publicationStatus: "published",
  reviewStatus: "reviewed",
  recordCount: reviewedRecords.length,
  contentHash: `fnv1a64:${fnv1a64(catalogFingerprint(reviewedRecords))}`,
  lastKnownGood: true,
});
export function createCatalogManifest(
  records: readonly CatalogVideo[],
  generatedAt = new Date().toISOString(),
  projectionVersion = ATLAS_PROJECTION_VERSION,
): CatalogManifest {
  const hasMetadataOnly = records.some((record) => record.contentStatus === "metadata_only");
  return catalogManifestSchema.parse({
    ...ATLAS_CATALOG_MANIFEST,
    projectionVersion,
    generatedAt,
    sourceCatalogVerifiedAt: generatedAt,
    recordCount: records.length,
    contentHash: `fnv1a64:${fnv1a64(catalogFingerprint(records))}`,
    contentScope: hasMetadataOnly ? "mixed_approved_metadata" : ATLAS_CONTENT_SCOPE,
    reviewStatus: hasMetadataOnly ? "mixed" : "reviewed",
  });
}
export function getCatalogPage(
  input: unknown = {},
  projection = { records: LAST_KNOWN_GOOD_CATALOG, manifest: ATLAS_CATALOG_MANIFEST },
): CatalogPage {
  const query = catalogQuerySchema.parse(input);
  const requestedTheme = query.theme ?? query.track;
  const normalizedQuery = query.q?.toLocaleLowerCase();
  const matching = projection.records.filter(
    (record) =>
      (!requestedTheme || videoThemes(record).includes(requestedTheme)) &&
      (!normalizedQuery ||
        [record.title, record.sourceChannel, ...videoThemes(record), record.code].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery),
        )),
  );
  const start = query.cursor
    ? Math.max(0, matching.findIndex((record) => record.id === query.cursor) + 1)
    : 0;
  const records = matching.slice(start, start + query.limit);
  const finalRecord = records.at(-1);
  return catalogPageSchema.parse({
    manifest: projection.manifest,
    records,
    nextCursor: finalRecord && start + records.length < matching.length ? finalRecord.id : null,
  });
}
export function getCatalogVideo(
  id: string,
  records: readonly CatalogVideo[] = LAST_KNOWN_GOOD_CATALOG,
) {
  return records.find((record) => record.id === id);
}
export function asVideo(record: CatalogVideo): Video {
  return record as Video;
}
export type { Track };
