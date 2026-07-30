import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { TRACK_EXAMPLES, TRACK_SUMMARIES } from "../../../data/summaries";
import { VIDEOS } from "../../../data/videos";
import { serializeVideo } from "./search-talks";

export default defineTool({
  name: "get_talk_summary",
  title: "Get talk summary",
  description:
    "Return the full editorial summary for one talk: claim, implication, when to use, caveat, and a worked example, plus source metadata.",
  inputSchema: {
    id: z.string().describe("Talk id (e.g. v21), catalog code (e.g. aie-021), or YouTube video id."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const key = id.trim().toLowerCase();
    const video = VIDEOS.find(
      (item) =>
        item.id.toLowerCase() === key ||
        item.code.toLowerCase() === key ||
        item.youtubeId.toLowerCase() === key,
    );

    if (!video) {
      return {
        content: [{ type: "text", text: `No talk found for "${id}".` }],
        isError: true,
      };
    }

    const payload = {
      talk: serializeVideo(video),
      summary: {
        ...TRACK_SUMMARIES[video.track],
        example: TRACK_EXAMPLES[video.track],
        contentBasis: "track_synthesis",
      },
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
