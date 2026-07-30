import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { withAudit } from "../audit";

import { TRACK_EXAMPLES, TRACK_SUMMARIES } from "../../../data/summaries";
import { TRACKS, videoThemes } from "../../../data/videos";
import { LAST_KNOWN_GOOD_CATALOG } from "../../atlas-catalog";

export default defineTool({
  name: "list_tracks",
  title: "List tracks",
  description:
    "List the nine AI engineering themes with talk counts and, optionally, the editorial synthesis for each theme.",
  inputSchema: {
    includeSummaries: z
      .boolean()
      .optional()
      .describe("Include the claim/implication/when-to-use/caveat synthesis for each track."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: withAudit("list_tracks", ({ includeSummaries }) => {
    const tracks = TRACKS.map((track) => ({
      code: track.code,
      name: track.name,
      talkCount: LAST_KNOWN_GOOD_CATALOG.filter((video) => videoThemes(video).includes(track.name))
        .length,
      ...(includeSummaries
        ? { summary: { ...TRACK_SUMMARIES[track.name], example: TRACK_EXAMPLES[track.name] } }
        : {}),
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ tracks }, null, 2) }],
      structuredContent: { tracks },
    };
  }),
});
