import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  ATLAS_CATALOG_MANIFEST,
  LAST_KNOWN_GOOD_CATALOG,
  catalogManifestSchema,
  catalogVideoSchema,
  createCatalogManifest,
  themeClassificationSchema,
  themeSchema,
  transcriptEvidenceSchema,
  transcriptSchema,
  type CatalogVideo,
} from "../src/lib/atlas-catalog";
import { classifyVideoTopics } from "../src/lib/topic-classification";
import { z } from "zod";

// This parser accepts reviewed local artifacts only. It makes no network call and
// intentionally does not accept raw transcript text or private transcript URLs.
export const localEvidenceArtifactSchema = z
  .object({
    schemaVersion: z.literal("atlas-local-evidence-v1"),
    videoId: z.string().min(1),
    themes: z.array(themeSchema).max(6),
    themeClassification: themeClassificationSchema.nullable(),
    transcript: transcriptSchema,
    evidence: z.array(transcriptEvidenceSchema),
    // Private, local parser input. This is deliberately discarded before the
    // public projection is constructed.
    classificationInput: z
      .object({
        title: z.string().min(1).max(500),
        description: z.string().max(10_000).optional(),
        transcript: z.string().max(100_000).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((artifact, context) => {
    if (new Set(artifact.themes).size !== artifact.themes.length)
      context.addIssue({ code: z.ZodIssueCode.custom, message: "themes must be unique" });
    for (const [index, evidence] of artifact.evidence.entries()) {
      if (evidence.videoId !== artifact.videoId)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidence", index],
          message: "evidence video mismatch",
        });
    }
  });

export function classifyApprovedLocalInput(input: {
  title: string;
  description?: string;
  transcript?: string;
}) {
  const themes = classifyVideoTopics(input);
  return {
    themes,
    themeClassification: themes.length
      ? {
          source: input.transcript
            ? ("approved_local_transcript" as const)
            : ("approved_local_metadata" as const),
          basis: input.transcript
            ? ("transcript_evidence_review" as const)
            : ("metadata_review" as const),
        }
      : null,
  };
}

export async function readLocalEvidenceArtifacts(directory: string) {
  const names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  const artifacts = await Promise.all(
    names.map(async (name) =>
      localEvidenceArtifactSchema.parse(JSON.parse(await readFile(join(directory, name), "utf8"))),
    ),
  );
  if (new Set(artifacts.map((artifact) => artifact.videoId)).size !== artifacts.length)
    throw new Error("Only one local transcript/evidence artifact is allowed per video.");
  return artifacts;
}

export function mergeLocalEvidenceArtifacts({
  records,
  artifacts,
  now,
  projectionVersion,
}: {
  records: readonly CatalogVideo[];
  artifacts: unknown[];
  now: string;
  projectionVersion?: string;
}) {
  const byId = new Map(records.map((record) => [record.id, record]));
  for (const input of artifacts) {
    const artifact = localEvidenceArtifactSchema.parse(input);
    const existing = byId.get(artifact.videoId);
    if (!existing)
      throw new Error(`Local evidence references unknown approved video: ${artifact.videoId}`);
    const classification = artifact.classificationInput
      ? classifyApprovedLocalInput(artifact.classificationInput)
      : { themes: artifact.themes, themeClassification: artifact.themeClassification };
    if (
      artifact.classificationInput &&
      (artifact.themes.join("\u001f") !== classification.themes.join("\u001f") ||
        !artifact.themeClassification ||
        artifact.themeClassification.source !== classification.themeClassification?.source ||
        artifact.themeClassification.basis !== classification.themeClassification?.basis)
    )
      throw new Error(
        "Local artifact themes and provenance must match its approved classification input.",
      );
    byId.set(
      artifact.videoId,
      catalogVideoSchema.parse({
        ...existing,
        themes: classification.themes,
        themeClassification: artifact.themeClassification,
        transcript: artifact.transcript,
        evidence: artifact.evidence,
      }),
    );
  }
  const merged = [...byId.values()];
  return {
    records: merged,
    manifest: createCatalogManifest(
      merged,
      now,
      projectionVersion ?? `atlas-transcript-projection-${now.slice(0, 10)}`,
    ),
  };
}

export async function buildTranscriptProjection() {
  const artifactDirectory = process.env.ATLAS_LOCAL_EVIDENCE_DIR ?? "data/transcript-evidence";
  const projectionPath =
    process.env.ATLAS_CATALOG_PROJECTION_PATH ?? "data/atlas-catalog-projection.json";
  const now = new Date().toISOString();
  let current = { manifest: ATLAS_CATALOG_MANIFEST, records: LAST_KNOWN_GOOD_CATALOG };
  try {
    const parsed = JSON.parse(await readFile(projectionPath, "utf8"));
    current = {
      manifest: catalogManifestSchema.parse(parsed.manifest),
      records: z.array(catalogVideoSchema).parse(parsed.records),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const artifacts = await readLocalEvidenceArtifacts(artifactDirectory);
  const next = mergeLocalEvidenceArtifacts({ records: current.records, artifacts, now });
  await mkdir(dirname(projectionPath), { recursive: true });
  await writeFile(`${projectionPath}.tmp`, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(`${projectionPath}.tmp`, projectionPath);
  return { projectionPath, recordCount: next.records.length, manifest: next.manifest };
}

if (import.meta.main) console.log(JSON.stringify(await buildTranscriptProjection()));
