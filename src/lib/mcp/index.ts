import { auth, defineMcp } from "@lovable.dev/mcp-js";

import getTalkSummaryTool from "./tools/get-talk-summary";
import listTracksTool from "./tools/list-tracks";
import searchTalksTool from "./tools/search-talks";

// The OAuth issuer must be the direct Supabase auth host: the managed proxy URL
// fails RFC 8414 issuer matching after publish. The project ref is inlined at
// build time by Vite.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ai-engineering-summary",
  title: "AI Engineering Summary",
  version: "0.1.0",
  instructions:
    "Tools for the AI Engineering Summary catalog of verified conference talks. Use `search_talks` to find talks by topic, theme, tag, or year, `get_talk_summary` for the full editorial summary of one talk, and `list_tracks` to browse the nine engineering themes.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchTalksTool, getTalkSummaryTool, listTracksTool],
});
