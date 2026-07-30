import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { TRACK_EXAMPLES, TRACK_SUMMARIES } from "../../../data/summaries";
import { TRACKS, VIDEOS } from "../../../data/videos";

export default defineTool({
  name: "list_tracks",
  title: "List tracks",
  description:
    "List the six AI engineering tracks with talk counts and, optionally, the editorial synthesis for each track.",
  inputSchema: {
    includeSummaries: z
      .boolean()
      .optional()
      .describe("Include the claim/implication/when-to-use/caveat synthesis for each track."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ includeSummaries }) => {
    const tracks = TRACKS.map((track) => ({
      code: track.code,
      name: track.name,
      talkCount: VIDEOS.filter((video) => video.track === track.name).length,
      ...(includeSummaries
        ? { summary: { ...TRACK_SUMMARIES[track.name], example: TRACK_EXAMPLES[track.name] } }
        : {}),
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ tracks }, null, 2) }],
      structuredContent: { tracks },
    };
  },
});
