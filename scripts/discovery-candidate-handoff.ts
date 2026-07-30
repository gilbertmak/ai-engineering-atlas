import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";

import type { DiscoveryCandidate } from "./youtube-discovery";

export const discoveryCandidateSchema = z.object({
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().min(1),
  channel: z.string().min(1),
  publishedAt: z.string().datetime({ offset: true }),
  durationSeconds: z.number().int().nonnegative(),
  status: z.enum(["known", "new"]),
  provenance: z.object({
    method: z.literal("youtube-data-api-v3"),
    retrievedAt: z.string().datetime({ offset: true }),
    uploadsPlaylistId: z.string().min(1),
  }),
});

const candidateHandoffSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string().datetime({ offset: true }),
  publicationStatus: z.literal("review_required"),
  candidates: z.array(discoveryCandidateSchema),
});

export type DiscoveryCandidateHandoff = z.infer<typeof candidateHandoffSchema>;

export async function saveDiscoveryCandidateHandoff(
  path: string,
  generatedAt: string,
  candidates: readonly DiscoveryCandidate[],
) {
  const handoff = candidateHandoffSchema.parse({
    version: 1,
    generatedAt,
    // Discovery remains a private candidate feed. This field intentionally has
    // no published state and is never read by the public API projection.
    publicationStatus: "review_required",
    candidates,
  });
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
  await rename(temporary, path);
  return handoff;
}
