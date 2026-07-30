// Compatibility entry point for local-only transcript enrichment. The input is
// a reviewed evidence artifact, never a caption download, raw transcript batch,
// or provider call. Official YouTube captions OAuth support remains out of scope.
import { z } from "zod";
import {
  mergeLocalEvidenceArtifacts,
  localEvidenceArtifactSchema,
  buildTranscriptProjection,
} from "./build-transcript-projection";
import type { CatalogVideo } from "../src/lib/atlas-catalog";

export const transcriptBatchSchema = z
  .object({ version: z.literal(2), artifacts: z.array(localEvidenceArtifactSchema) })
  .strict();
export function mergeTranscriptClassifications(records: readonly CatalogVideo[], input: unknown) {
  const batch = transcriptBatchSchema.parse(input);
  const merged = mergeLocalEvidenceArtifacts({
    records,
    artifacts: batch.artifacts,
    now: "2026-07-28T00:00:00Z",
  });
  return { records: merged.records, enrichedCount: batch.artifacts.length };
}
export const enrichProjectionFromTranscripts = buildTranscriptProjection;
