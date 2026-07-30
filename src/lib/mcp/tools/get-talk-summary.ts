import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { withAudit } from "../audit";

import { talkInsightForVideo } from "../../../data/talk-insights";
import { LAST_KNOWN_GOOD_CATALOG } from "../../atlas-catalog";
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
  handler: withAudit("get_talk_summary", ({ id }) => {
    const key = id.trim().toLowerCase();
    const video = LAST_KNOWN_GOOD_CATALOG.find(
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

    const reviewedInsight =
      video.insightReviewStatus === "approved" ? talkInsightForVideo(video) : undefined;
    const payload = {
      talk: serializeVideo(video),
      summary:
        reviewedInsight ??
        {
          contentBasis: "metadata_only",
          status: "No reviewed insight is available for this catalog record yet.",
        },
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  }),
});
