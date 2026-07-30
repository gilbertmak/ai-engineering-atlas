import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  ATLAS_CATALOG_MANIFEST,
  LAST_KNOWN_GOOD_CATALOG,
  catalogManifestSchema,
  catalogVideoSchema,
  createCatalogManifest,
  type CatalogVideo,
} from "../src/lib/atlas-catalog";
import { discoveryCandidateSchema } from "./discovery-candidate-handoff";
import { classifyVideoTopics } from "../src/lib/topic-classification";

export function mergeApprovedMetadataCandidates({
  records,
  candidates,
  approvedChannel,
  approvedUploadsPlaylistId,
  now,
}: {
  records: readonly CatalogVideo[];
  candidates: unknown[];
  approvedChannel: string;
  approvedUploadsPlaylistId: string;
  now: string;
}) {
  if (!approvedChannel || !approvedUploadsPlaylistId) {
    throw new Error(
      "Approved channel and uploads playlist are required for metadata auto-publication.",
    );
  }
  const byYoutubeId = new Map(records.map((record) => [record.youtubeId, record]));
  for (const candidateInput of candidates) {
    const candidate = discoveryCandidateSchema.parse(candidateInput);
    if (
      candidate.channel !== approvedChannel ||
      candidate.provenance.uploadsPlaylistId !== approvedUploadsPlaylistId ||
      byYoutubeId.has(candidate.youtubeId)
    )
      continue;
    byYoutubeId.set(
      candidate.youtubeId,
      catalogVideoSchema.parse({
        id: `youtube-${candidate.youtubeId}`,
        code: `src-${candidate.youtubeId.toLowerCase()}`,
        title: candidate.title,
        sourceChannel: candidate.channel,
        track: null,
        tracks: classifyVideoTopics({ title: candidate.title }),
        themes: classifyVideoTopics({ title: candidate.title }),
        themeClassification: classifyVideoTopics({ title: candidate.title }).length
          ? {
              source: "approved_local_metadata",
              basis: "metadata_review",
              reviewedAt: now,
              reviewerVersion: "metadata-auto-v1",
            }
          : null,
        publishedAt: candidate.publishedAt,
        durationSeconds: candidate.durationSeconds || 1,
        youtubeId: candidate.youtubeId,
        contentStatus: "metadata_only",
      }),
    );
  }
  for (const [youtubeId, record] of byYoutubeId) {
    if (record.sourceChannel !== approvedChannel || record.contentStatus !== "metadata_only")
      continue;
    byYoutubeId.set(
      youtubeId,
      catalogVideoSchema.parse({
        ...record,
        tracks: classifyVideoTopics({ title: record.title }),
        themes: classifyVideoTopics({ title: record.title }),
        themeClassification: classifyVideoTopics({ title: record.title }).length
          ? {
              source: "approved_local_metadata",
              basis: "metadata_review",
              reviewedAt: now,
              reviewerVersion: "metadata-auto-v1",
            }
          : null,
      }),
    );
  }
  const merged = [...byYoutubeId.values()].sort(
    (a, b) =>
      Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
      a.youtubeId.localeCompare(b.youtubeId),
  );
  return {
    manifest: createCatalogManifest(merged, now, `atlas-source-catalog-${now.slice(0, 10)}`),
    records: merged,
  };
}

export async function publishDiscoveryMetadata() {
  if (process.env.ATLAS_METADATA_AUTO_PUBLISH_ENABLED !== "true") {
    throw new Error(
      "Metadata auto-publication is disabled; set ATLAS_METADATA_AUTO_PUBLISH_ENABLED=true after approval.",
    );
  }
  const candidatePath =
    process.env.YOUTUBE_DISCOVERY_CANDIDATES_PATH ?? "data/youtube-discovery-candidates.json";
  const projectionPath =
    process.env.ATLAS_CATALOG_PROJECTION_PATH ?? "data/atlas-catalog-projection.json";
  const candidateHandoff = JSON.parse(await readFile(candidatePath, "utf8")) as {
    candidates: unknown[];
  };
  let current = { manifest: ATLAS_CATALOG_MANIFEST, records: LAST_KNOWN_GOOD_CATALOG };
  try {
    const parsed = JSON.parse(await readFile(projectionPath, "utf8")) as {
      manifest: unknown;
      records: unknown;
    };
    current = {
      manifest: catalogManifestSchema.parse(parsed.manifest),
      records: catalogVideoSchema.array().parse(parsed.records),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const next = mergeApprovedMetadataCandidates({
    records: current.records,
    candidates: candidateHandoff.candidates,
    approvedChannel: process.env.ATLAS_APPROVED_YOUTUBE_CHANNEL ?? "",
    approvedUploadsPlaylistId: process.env.ATLAS_APPROVED_UPLOADS_PLAYLIST_ID ?? "",
    now: new Date().toISOString(),
  });
  await mkdir(dirname(projectionPath), { recursive: true });
  await writeFile(`${projectionPath}.tmp`, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(`${projectionPath}.tmp`, projectionPath);
  return { projectionPath, manifest: next.manifest, recordCount: next.records.length };
}

if (import.meta.main) console.log(JSON.stringify(await publishDiscoveryMetadata()));
