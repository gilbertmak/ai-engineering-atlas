import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import publicCatalog from "../src/data/atlas-public-catalog.json";
import { TALK_INSIGHTS, talkInsightForVideo } from "../src/data/talk-insights";
import { TRACKS } from "../src/data/videos";

const root = process.cwd();
const catalogBaseline = JSON.parse(
  readFileSync(join(root, "evals/catalog-baseline.json"), "utf8"),
) as typeof import("../evals/catalog-baseline.json");
const insightBaseline = JSON.parse(
  readFileSync(join(root, "evals/insight-baseline.json"), "utf8"),
) as typeof import("../evals/insight-baseline.json");
const source = readFileSync(join(root, "src/routes/index.tsx"), "utf8");

describe("Atlas release evals", () => {
  test("the complete public catalog matches the approved 984-record baseline", () => {
    expect(publicCatalog.records).toHaveLength(984);
    expect(publicCatalog.records).toHaveLength(catalogBaseline.recordCount);
    expect(publicCatalog.manifest.contentHash).toBe(catalogBaseline.contentHash);
    expect(new Set(publicCatalog.records.map((video) => video.id)).size).toBe(984);
    expect(new Set(publicCatalog.records.map((video) => video.code)).size).toBe(984);
    expect(new Set(publicCatalog.records.map((video) => video.youtubeId)).size).toBe(984);
    expect(
      publicCatalog.records.map(
        ({
          id,
          code,
          youtubeId,
          title,
          sourceChannel,
          publishedAt,
          durationSeconds,
          insightReviewStatus,
        }) => ({
          id,
          code,
          youtubeId,
          title,
          sourceChannel,
          publishedAt,
          durationSeconds,
          insightReviewStatus,
        }),
      ),
    ).toEqual(catalogBaseline.records);
  });

  test("the restored insight map retains all 348 reviewed mappings", () => {
    const insights = Object.entries(TALK_INSIGHTS);
    expect(insights).toHaveLength(348);
    expect(insightBaseline.total).toBe(348);
    expect(
      insights.filter(([, insight]) => insight.contentBasis === "transcript_backed"),
    ).toHaveLength(344);
    expect(
      insights.filter(([, insight]) => insight.contentBasis === "source_synthesis"),
    ).toHaveLength(4);
    expect(insights.filter(([, insight]) => insight.timestampSeconds !== null)).toHaveLength(347);

    for (const record of publicCatalog.records.filter(
      (video) => video.insightReviewStatus === "approved",
    )) {
      const insight = talkInsightForVideo(record);
      expect(insight).toBeDefined();
      expect(insight?.claim.trim()).not.toBe("");
      expect(insight?.implication.trim()).not.toBe("");
      expect(insight?.whenToUse.trim()).not.toBe("");
      expect(insight?.caveat.trim()).not.toBe("");
    }
    expect(
      publicCatalog.records.filter((video) => video.insightReviewStatus === "approved"),
    ).toHaveLength(348);
    expect(
      publicCatalog.records.filter((video) => video.insightReviewStatus === "unmapped"),
    ).toHaveLength(636);
  });

  test("infinite scroll and the historical modal contract remain present", () => {
    for (const requiredToken of [
      "const PAGE_SIZE = 12",
      "IntersectionObserver",
      "Load {Math.min",
      "Category:",
      "<Clock",
      "sm:h-[75vh]",
      "Insight",
      "Why it matters",
      "Use it when",
      "Caveat",
      "Open on YouTube",
    ])
      expect(source).toContain(requiredToken);
    for (const removedToken of [
      "Track synthesis · not a transcript summary",
      "Illustrative example",
      "Transcript-backed insight",
    ])
      expect(source).not.toContain(removedToken);
  });

  test("long-form insights are deferred until a reviewed modal opens", () => {
    expect(source).toContain('import("@/data/talk-insights")');
    expect(source).not.toContain(
      'import { TALK_INSIGHTS, type IllustrativeExample, type TalkInsight } from "@/data/talk-insights"',
    );
    expect(source).toContain('aria-label="Loading reviewed insight"');
    expect(source).toContain('data-testid="modal-action-skeleton"');
    expect(source).toContain("{insight ? (");
  });

  test("Lovable MCP, OAuth and Supabase paths remain present", () => {
    for (const path of [
      "src/routes/mcp.ts",
      "src/routes/[.mcp]/list-tools.ts",
      "src/routes/[.mcp]/invoke-tool/$tool.ts",
      "src/routes/[.well-known]/oauth-protected-resource.ts",
      "src/routes/auth.tsx",
      "src/integrations/supabase/client.server.ts",
      "src/lib/mcp/audit.ts",
    ])
      expect(existsSync(join(root, path))).toBe(true);

    for (const toolPath of [
      "src/lib/mcp/tools/search-talks.ts",
      "src/lib/mcp/tools/get-talk-summary.ts",
      "src/lib/mcp/tools/list-tracks.ts",
    ])
      expect(readFileSync(join(root, toolPath), "utf8")).toContain("withAudit");
  });

  test("the public snapshot excludes private transcript and reviewer fields", () => {
    const serialized = JSON.stringify(publicCatalog);
    for (const forbidden of [
      '"transcript"',
      '"evidence"',
      '"reviewerVersion"',
      '"acquisitionRunId"',
      '"rightsBasis"',
    ])
      expect(serialized).not.toContain(forbidden);

    const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n");
    for (const path of [".env", "data/atlas-catalog-projection.json", "data/transcript-evidence/"])
      expect(
        tracked.some((entry) => entry === path || (path.endsWith("/") && entry.startsWith(path))),
      ).toBe(false);
  });

  test("the six-theme vocabulary remains deterministic", () => {
    expect(TRACKS).toHaveLength(6);
    expect(new Set(TRACKS.map((track) => track.name)).size).toBe(6);
  });
});
