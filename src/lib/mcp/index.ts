import { defineMcp } from "@lovable.dev/mcp-js";

import getTalkSummaryTool from "./tools/get-talk-summary";
import listTracksTool from "./tools/list-tracks";
import searchTalksTool from "./tools/search-talks";

export default defineMcp({
  name: "ai-engineering-summary",
  title: "AI Engineering Summary",
  version: "0.1.0",
  instructions:
    "Tools for the AI Engineering Summary catalog of verified conference talks. Use `search_talks` to find talks by topic, track, or year, `get_talk_summary` for the full editorial summary of one talk, and `list_tracks` to browse the six engineering tracks.",
  tools: [searchTalksTool, getTalkSummaryTool, listTracksTool],
});
