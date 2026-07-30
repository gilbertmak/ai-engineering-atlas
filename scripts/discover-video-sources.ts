import { VIDEOS } from "../src/data/videos";
import {
  discoverYouTubeCatalog,
  loadDiscoveryState,
  saveDiscoveryState,
} from "./youtube-discovery";
import { saveDiscoveryCandidateHandoff } from "./discovery-candidate-handoff";

export async function runDiscovery({ full = false, scheduled = false } = {}) {
  if (scheduled && process.env.ATLAS_DISCOVERY_SCHEDULE_ENABLED !== "true") {
    throw new Error(
      "Scheduled discovery is disabled. Set ATLAS_DISCOVERY_SCHEDULE_ENABLED=true in the private worker environment after approval.",
    );
  }
  const statePath = process.env.YOUTUBE_DISCOVERY_STATE_PATH ?? "data/youtube-discovery-state.json";
  const candidatePath =
    process.env.YOUTUBE_DISCOVERY_CANDIDATES_PATH ?? "data/youtube-discovery-candidates.json";
  const state = await loadDiscoveryState(statePath);
  const result = await discoverYouTubeCatalog({
    apiKey: process.env.YOUTUBE_DATA_API_KEY ?? "",
    uploadsPlaylistId:
      process.env.YOUTUBE_DISCOVERY_UPLOADS_PLAYLIST_ID?.trim() || state.uploadsPlaylistId,
    channelId: process.env.YOUTUBE_DISCOVERY_CHANNEL_ID?.trim() || undefined,
    channelHandle: process.env.YOUTUBE_DISCOVERY_CHANNEL_HANDLE?.trim() || "aiDotEngineer",
    knownYoutubeIds: [
      ...new Set([...state.knownYoutubeIds, ...VIDEOS.map((video) => video.youtubeId)]),
    ],
    highWaterYoutubeId: state.highWaterYoutubeId,
    full,
  });
  const updatedAt = new Date().toISOString();
  await saveDiscoveryState(statePath, {
    version: 1,
    uploadsPlaylistId: result.uploadsPlaylistId,
    knownYoutubeIds: [
      ...new Set([
        ...state.knownYoutubeIds,
        ...result.candidates.map((candidate) => candidate.youtubeId),
      ]),
    ],
    highWaterYoutubeId: result.highWaterYoutubeId,
    updatedAt,
  });
  const candidateHandoff = await saveDiscoveryCandidateHandoff(
    candidatePath,
    updatedAt,
    result.candidates,
  );
  return {
    source: "youtube-data-api-v3",
    fallback: "none",
    full,
    scheduled,
    statePath,
    candidatePath,
    publicationStatus: candidateHandoff.publicationStatus,
    updatedAt,
    ...result,
  };
}

if (import.meta.main) {
  const args = new Set(process.argv.slice(2));
  const full = args.delete("--full");
  const scheduled = args.delete("--scheduled");
  if (args.size) throw new Error("Only --full and --scheduled are supported.");
  console.log(JSON.stringify(await runDiscovery({ full, scheduled })));
}
