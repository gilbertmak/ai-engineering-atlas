import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { talkInsightForVideo } from "../src/data/talk-insights";
import { TRACKS, VIDEOS } from "../src/data/videos";

type BaselineVideo = (typeof VIDEOS)[number] & { publishedAt: string; durationSeconds: number };

const root = process.cwd();
const baseline = JSON.parse(readFileSync(join(root, "evals/catalog-baseline.json"), "utf8")) as {
  videos: BaselineVideo[];
};
const source = readFileSync(join(root, "src/routes/index.tsx"), "utf8");

describe("Atlas release evals", () => {
  test("catalog exactly matches the independent approved baseline", () => {
    expect(VIDEOS).toHaveLength(baseline.videos.length);
    const expectedById = new Map(baseline.videos.map((video) => [video.id, video]));
    expect(new Set(VIDEOS.map((video) => video.id)).size).toBe(VIDEOS.length);
    expect(new Set(VIDEOS.map((video) => video.code)).size).toBe(VIDEOS.length);
    expect(new Set(VIDEOS.map((video) => video.youtubeId)).size).toBe(VIDEOS.length);

    for (const video of VIDEOS) {
      const expected = expectedById.get(video.id);
      expect(expected).toBeDefined();
      expect(video.code).toBe(expected?.code);
      expect(video.youtubeId).toBe(expected?.youtubeId);
      expect(video.title).toBe(expected?.title);
      expect(video.sourceChannel).toBe(expected?.sourceChannel);
      expect(video.track).toBe(expected?.track);
      expect(video.publishedAt).toBe(expected?.publishedAt);
      expect(video.durationSeconds).toBe(expected?.durationSeconds);
    }
    expect(VIDEOS.some((video) => video.youtubeId === "kxT8-C1vmd4")).toBe(false);
  });

  test("every catalog record has a complete video-specific insight", () => {
    const basisCounts = { transcript_backed: 0, source_synthesis: 0 };
    for (const video of VIDEOS) {
      const insight = talkInsightForVideo(video);
      expect(insight).toBeDefined();
      expect(insight?.claim.trim()).not.toBe("");
      expect(insight?.implication.trim()).not.toBe("");
      expect(insight?.whenToUse.trim()).not.toBe("");
      expect(insight?.caveat.trim()).not.toBe("");
      expect(insight?.example.situation.trim()).not.toBe("");
      expect(insight?.example.application.trim()).not.toBe("");
      expect(insight?.example.observableOutcome.trim()).not.toBe("");
      if (insight?.contentBasis === "transcript_backed") {
        basisCounts.transcript_backed += 1;
        expect(insight.timestampSeconds).toBeGreaterThanOrEqual(0);
        expect(insight.reviewedAt).toMatch(/^2026-07-/);
      } else if (insight?.contentBasis === "source_synthesis") {
        basisCounts.source_synthesis += 1;
      }
    }
    expect(basisCounts).toEqual({ transcript_backed: 11, source_synthesis: 4 });
  });

  test("modal contract preserves required and removed elements", () => {
    for (const requiredToken of [
      "Category:",
      "<Clock",
      "sm:h-[75vh]",
      "Insight",
      "Why it matters",
      "Use it when",
      "Caveat",
      "Open on YouTube",
    ]) {
      expect(source).toContain(requiredToken);
    }
    for (const removedToken of [
      "Track synthesis · not a transcript summary",
      "Illustrative example",
      "Transcript-backed insight",
    ]) {
      expect(source).not.toContain(removedToken);
    }
  });

  test("Lovable MCP, OAuth and Supabase paths remain present", () => {
    const requiredPaths = [
      "src/routes/mcp.ts",
      "src/routes/[.mcp]/list-tools.ts",
      "src/routes/[.mcp]/invoke-tool/$tool.ts",
      "src/routes/[.well-known]/oauth-protected-resource.ts",
      "src/routes/auth.tsx",
      "src/integrations/supabase/client.server.ts",
      "src/lib/mcp/audit.ts",
    ];
    for (const path of requiredPaths) expect(existsSync(join(root, path))).toBe(true);

    const mcpIndex = readFileSync(join(root, "src/lib/mcp/index.ts"), "utf8");
    expect(mcpIndex).toContain("auth.oauth.issuer");
    expect(mcpIndex).toContain("searchTalksTool");
    expect(mcpIndex).toContain("getTalkSummaryTool");
    expect(mcpIndex).toContain("listTracksTool");
    for (const toolPath of [
      "src/lib/mcp/tools/search-talks.ts",
      "src/lib/mcp/tools/get-talk-summary.ts",
      "src/lib/mcp/tools/list-tracks.ts",
    ]) {
      expect(readFileSync(join(root, toolPath), "utf8")).toContain("withAudit");
    }
  });

  test("private data and credentials are ignored and not tracked", () => {
    const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
    for (const path of [
      ".env",
      "data/atlas-catalog-projection.json",
      "data/transcript-evidence/",
      "data/youtube-discovery-candidates.json",
      "data/youtube-discovery-state.json",
    ]) {
      expect(gitignore).toContain(path);
    }
    const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" });
    for (const path of [
      ".env",
      "data/atlas-catalog-projection.json",
      "data/transcript-evidence/",
      "data/youtube-discovery-candidates.json",
      "data/youtube-discovery-state.json",
    ]) {
      expect(tracked).not.toContain(path);
    }
  });

  test("track vocabulary and ordering remain deterministic", () => {
    expect(TRACKS).toHaveLength(6);
    expect(new Set(TRACKS.map((track) => track.name)).size).toBe(6);
    expect(VIDEOS).toEqual(
      [...VIDEOS].sort(
        (a, b) =>
          Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
          a.youtubeId.localeCompare(b.youtubeId),
      ),
    );
  });
});
