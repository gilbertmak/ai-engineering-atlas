import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { withAudit } from "../audit";

import { TRACKS, videoDuration, videoThemes, videoYear } from "../../../data/videos";
import { LAST_KNOWN_GOOD_CATALOG } from "../../atlas-catalog";

export const TRACK_NAMES = TRACKS.map((track) => track.name);

export function serializeVideo(video: (typeof LAST_KNOWN_GOOD_CATALOG)[number]) {
  return {
    id: video.id,
    code: video.code,
    title: video.title,
    channel: video.sourceChannel,
    track: video.track,
    themes: videoThemes(video),
    insightReviewStatus: video.insightReviewStatus,
    publishedAt: video.publishedAt,
    year: videoYear(video),
    duration: videoDuration(video),
    durationSeconds: video.durationSeconds,
    youtubeId: video.youtubeId,
    youtubeUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
  };
}

export default defineTool({
  name: "search_talks",
  title: "Search talks",
  description:
    "Search the verified catalog of AI engineering conference talks by free text, track, and year.",
  inputSchema: {
    query: z.string().optional().describe("Free-text match against talk title, channel, or track."),
    track: z.string().optional().describe(`Filter by track: ${TRACK_NAMES.join(", ")}.`),
    year: z.number().int().optional().describe("Filter by publication year (UTC)."),
    limit: z.number().int().optional().describe("Maximum number of results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAudit("search_talks", ({ query, track, year, limit }) => {
    const needle = query?.trim().toLowerCase() ?? "";
    const matches = LAST_KNOWN_GOOD_CATALOG.filter((video) => {
      if (
        track &&
        !videoThemes(video).some((theme) => theme.toLowerCase() === track.toLowerCase())
      )
        return false;
      if (year && videoYear(video) !== year) return false;
      if (!needle) return true;
      return `${video.title} ${video.sourceChannel} ${videoThemes(video).join(" ")} ${video.code}`
        .toLowerCase()
        .includes(needle);
    }).slice(0, Math.max(1, Math.min(limit ?? 20, 50)));

    const results = matches.map(serializeVideo);
    return {
      content: [{ type: "text", text: JSON.stringify({ count: results.length, results }, null, 2) }],
      structuredContent: { count: results.length, results },
    };
  }),
});
