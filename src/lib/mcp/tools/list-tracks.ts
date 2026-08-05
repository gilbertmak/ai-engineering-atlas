import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { withAudit } from "../audit";

import { TRACK_EXAMPLES, TRACK_SUMMARIES } from "../../../data/summaries";
import { loadPublicCatalog, videoThemes } from "../public-projections";

const TRACKS = [
  { code: "01", name: "System Design" },
  { code: "02", name: "Data & Eval" },
  { code: "03", name: "Reliability" },
  { code: "04", name: "Observability" },
  { code: "05", name: "Safety & Control" },
  { code: "06", name: "Deployment" },
  { code: "07", name: "Knowledge" },
  { code: "08", name: "Developer Workflows" },
  { code: "09", name: "Models & Training" },
] as const;

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
  handler: withAudit("list_tracks", async ({ includeSummaries }) => {
    const { records } = await loadPublicCatalog();
    const tracks = TRACKS.map((track) => ({
      code: track.code,
      name: track.name,
      talkCount: records.filter((video) => videoThemes(video).includes(track.name))
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
