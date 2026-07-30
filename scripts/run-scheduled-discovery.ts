import { publishDiscoveryMetadata } from "./publish-discovery-metadata";
import { runDiscovery } from "./discover-video-sources";

// The scheduled launcher must receive exactly one machine-readable stdout line.
// Errors are thrown to stderr and produce no success/audit object.
const discovery = await runDiscovery({ scheduled: true });
const publication = await publishDiscoveryMetadata();
console.log(
  JSON.stringify({
    version: 1,
    outcome: "published_metadata_only",
    source: discovery.source,
    fallback: discovery.fallback,
    completedAt: publication.manifest.generatedAt,
    candidatePath: discovery.candidatePath,
    candidateCount: discovery.candidates.length,
    publicationStatus: discovery.publicationStatus,
    projectionPath: publication.projectionPath,
    projectionVersion: publication.manifest.projectionVersion,
    contentHash: publication.manifest.contentHash,
    recordCount: publication.recordCount,
  }),
);
