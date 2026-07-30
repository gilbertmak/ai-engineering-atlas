import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { talkInsightForVideo } from "../src/data/talk-insights";
import { TRACKS, VIDEOS } from "../src/data/videos";

type BaselineVideo = {
  id: string;
  code: string;
  youtubeId: string;
  title: string;
  sourceChannel: string;
  track: string;
  publishedAt: string;
  durationSeconds: number;
};

type EvalDefinition = {
  id: string;
  title: string;
  requirementRefs: string[];
  gateType: "binary" | "manual";
  blocking: boolean;
  status: "executed" | "attached" | "waived" | "pending" | "not-applicable";
  owner: string;
  priority: string;
  automation: string;
  command: string | null;
  testOrFixture: string;
  passCriteria: string;
  privacyClassification: string;
  evidencePath: string;
  releaseImpact: string;
  approver?: string;
  expiry?: string | null;
  waiver?: string | null;
};

type Manifest = {
  schemaVersion: number;
  statusVocabulary: string[];
  outcomes: string[];
  catalogPolicy: {
    expectedRecordCount: number;
    expectedInsightBasisCounts: Record<string, number>;
  };
  evals: EvalDefinition[];
};

const root = process.cwd();
const command = "npm run evals:validate";
const reportDir = join(root, "artifacts/evals");
const readJson = <T>(relativePath: string) =>
  JSON.parse(readFileSync(join(root, relativePath), "utf8")) as T;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function hashFiles(paths: string[]) {
  const hash = createHash("sha256");
  for (const relativePath of paths) {
    hash.update(relativePath);
    hash.update(readFileSync(join(root, relativePath)));
  }
  return hash.digest("hex");
}

function git(args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function assertUnique(values: string[], label: string) {
  assert(new Set(values).size === values.length, `${label} contains duplicates`);
}

function assertExactSet(actual: string[], expected: string[], label: string) {
  assertUnique(actual, label);
  assertUnique(expected, `${label} baseline`);
  assert(
    actual.length === expected.length && expected.every((value) => actual.includes(value)),
    `${label} drifted: expected ${expected.join(", ")}, received ${actual.join(", ")}`,
  );
}

function runAssertions() {
  const baseline = readJson<{ schemaVersion: number; videos: BaselineVideo[] }>(
    "evals/catalog-baseline.json",
  );
  const manifest = readJson<Manifest>("evals/manifest.json");
  const requirements = readFileSync(join(root, "evals/requirements.md"), "utf8");
  const source = readFileSync(join(root, "src/routes/index.tsx"), "utf8");

  assert(baseline.schemaVersion === 1, "Unsupported catalog baseline schema");
  assert(manifest.schemaVersion === 1, "Unsupported eval manifest schema");
  assert(manifest.statusVocabulary.includes("pending"), "Manifest must preserve pending status");
  assert(manifest.outcomes.includes("error"), "Manifest must preserve error outcome");
  assert(
    manifest.catalogPolicy.expectedRecordCount === baseline.videos.length,
    "Catalog policy count disagrees with baseline",
  );
  assert(manifest.evals.length > 0, "Eval manifest is empty");

  const requirementIds = new Set(
    [...requirements.matchAll(/`(ATLAS-[A-Z]+-\d{3})`/g)].map((match) => match[1]),
  );
  assertUnique(
    manifest.evals.map((evaluation) => evaluation.id),
    "eval IDs",
  );
  for (const evaluation of manifest.evals) {
    assert(
      evaluation.id && evaluation.title && evaluation.owner,
      `Incomplete eval ${evaluation.id}`,
    );
    assert(evaluation.requirementRefs.length > 0, `Eval ${evaluation.id} has no requirement refs`);
    assert(
      evaluation.testOrFixture && evaluation.passCriteria,
      `Eval ${evaluation.id} lacks evidence metadata`,
    );
    assert(
      evaluation.privacyClassification && evaluation.evidencePath,
      `Eval ${evaluation.id} lacks privacy/evidence metadata`,
    );
    for (const requirementId of evaluation.requirementRefs) {
      assert(
        requirementIds.has(requirementId),
        `${evaluation.id} references unknown ${requirementId}`,
      );
    }
    if (evaluation.gateType === "manual") {
      assert(
        evaluation.command === null,
        `Manual eval ${evaluation.id} must not claim an executable command`,
      );
      assert(evaluation.approver !== undefined, `Manual eval ${evaluation.id} has no approver`);
      assert(
        evaluation.expiry !== undefined && evaluation.waiver !== undefined,
        `Manual eval ${evaluation.id} lacks waiver metadata`,
      );
    } else if (evaluation.blocking) {
      assert(evaluation.command, `Blocking eval ${evaluation.id} has no executable command`);
    }
  }

  const expectedById = new Map(baseline.videos.map((video) => [video.id, video]));
  assert(
    VIDEOS.length === manifest.catalogPolicy.expectedRecordCount,
    "Catalog record count changed",
  );
  assertExactSet(
    VIDEOS.map((video) => video.id),
    baseline.videos.map((video) => video.id),
    "catalog video IDs",
  );
  assertUnique(
    VIDEOS.map((video) => video.code),
    "catalog codes",
  );
  assertUnique(
    VIDEOS.map((video) => video.youtubeId),
    "catalog YouTube IDs",
  );

  const basisCounts: Record<string, number> = {};
  for (const video of VIDEOS) {
    const expected = expectedById.get(video.id);
    assert(expected, `Video ${video.id} is not in the approved baseline`);
    for (const field of [
      "code",
      "youtubeId",
      "title",
      "sourceChannel",
      "track",
      "publishedAt",
      "durationSeconds",
    ] as const) {
      assert(
        video[field] === expected[field],
        `${video.id}.${field} drifted from the approved baseline`,
      );
    }
    assert(/^[A-Za-z0-9_-]{11}$/.test(video.youtubeId), `${video.id} has an invalid YouTube ID`);
    assert(video.durationSeconds > 0, `${video.id} has no positive duration`);
    assert(
      !Number.isNaN(Date.parse(video.publishedAt)),
      `${video.id} has an invalid publication date`,
    );
    const insight = talkInsightForVideo(video);
    assert(insight, `${video.id} has no video-specific insight or explicit fallback`);
    for (const field of ["claim", "implication", "whenToUse", "caveat"] as const) {
      assert(insight[field].trim(), `${video.id} insight field ${field} is empty`);
    }
    for (const field of ["situation", "application", "observableOutcome"] as const) {
      assert(insight.example[field].trim(), `${video.id} example field ${field} is empty`);
    }
    basisCounts[insight.contentBasis] = (basisCounts[insight.contentBasis] ?? 0) + 1;
    if (insight.contentBasis === "transcript_backed") {
      assert(
        insight.timestampSeconds !== null && insight.timestampSeconds >= 0,
        `${video.id} transcript insight has no valid timestamp`,
      );
      assert(
        insight.reviewedAt !== null && !Number.isNaN(Date.parse(insight.reviewedAt)),
        `${video.id} transcript insight has no valid review date`,
      );
    }
  }
  assert(
    JSON.stringify(basisCounts) ===
      JSON.stringify(manifest.catalogPolicy.expectedInsightBasisCounts),
    `Insight basis counts drifted: expected ${JSON.stringify(manifest.catalogPolicy.expectedInsightBasisCounts)}, received ${JSON.stringify(basisCounts)}`,
  );

  assert(TRACKS.length === 6, "Atlas must retain six tracks");
  assertUnique(
    TRACKS.map((track) => track.name),
    "Atlas tracks",
  );
  assert(
    VIDEOS.every((video) => TRACKS.some((track) => track.name === video.track)),
    "Every video must use a known track",
  );
  assert(
    VIDEOS.some((video) => video.youtubeId === "Yk87oUPVaxU"),
    "DeepSWE record is missing",
  );
  assert(
    VIDEOS.every(
      (video, index, all) =>
        index === 0 || Date.parse(all[index - 1].publishedAt) >= Date.parse(video.publishedAt),
    ),
    "Catalog ordering is not newest-first",
  );

  for (const token of [
    "Category:",
    "<Clock",
    "sm:h-[75vh]",
    "Why it matters",
    "Use it when",
    "Caveat",
  ]) {
    assert(source.includes(token), `Modal contract token missing: ${token}`);
  }
  for (const removedToken of [
    "Track synthesis · not a transcript summary",
    "Illustrative example",
    "Transcript-backed insight",
  ]) {
    assert(!source.includes(removedToken), `Removed modal token returned: ${removedToken}`);
  }

  const requiredPaths = [
    "src/routes/mcp.ts",
    "src/routes/[.mcp]/list-tools.ts",
    "src/routes/[.mcp]/invoke-tool/$tool.ts",
    "src/routes/[.well-known]/oauth-protected-resource.ts",
    "src/routes/auth.tsx",
    "src/integrations/supabase/client.server.ts",
    "src/lib/mcp/audit.ts",
  ];
  for (const requiredPath of requiredPaths)
    assert(
      existsSync(join(root, requiredPath)),
      `Required integration path is missing: ${requiredPath}`,
    );
  const mcpIndex = readFileSync(join(root, "src/lib/mcp/index.ts"), "utf8");
  assert(mcpIndex.includes("auth.oauth.issuer"), "MCP OAuth issuer boundary is missing");
  for (const toolPath of ["search-talks.ts", "get-talk-summary.ts", "list-tracks.ts"]) {
    assert(
      readFileSync(join(root, "src/lib/mcp/tools", toolPath), "utf8").includes("withAudit"),
      `${toolPath} lost audit wrapping`,
    );
  }

  const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
  const privatePaths = [
    ".env",
    "data/atlas-catalog-projection.json",
    "data/transcript-evidence/",
    "data/youtube-discovery-candidates.json",
    "data/youtube-discovery-state.json",
  ];
  for (const privatePath of privatePaths) {
    assert(gitignore.includes(privatePath), `Private path is not ignored: ${privatePath}`);
    try {
      execFileSync("git", ["check-ignore", "--no-index", "-q", privatePath], { cwd: root });
    } catch {
      throw new Error(`Private path can be staged: ${privatePath}`);
    }
  }
  const trackedFiles = git(["ls-files"]).split("\n").filter(Boolean);
  for (const privatePath of privatePaths) {
    assert(
      !trackedFiles.some(
        (tracked) =>
          tracked === privatePath || (privatePath.endsWith("/") && tracked.startsWith(privatePath)),
      ),
      `Private data is tracked: ${privatePath}`,
    );
  }
}

const fixturePaths = [
  "evals/catalog-baseline.json",
  "evals/manifest.json",
  "evals/requirements.md",
];
const revision = git(["rev-parse", "HEAD"]);
const dirty = git(["status", "--porcelain"]);
const report = {
  schemaVersion: 1,
  executionStatus: "executed",
  outcome: "pass" as "pass" | "fail",
  command,
  revision,
  dirtyWorktree: dirty.length > 0,
  fixtureDigest: hashFiles(fixturePaths),
  lockfileDigest: hashFiles(["package-lock.json"]),
  generatedAt: new Date().toISOString(),
  failures: [] as string[],
};

try {
  runAssertions();
} catch (error) {
  report.outcome = "fail";
  report.failures.push(error instanceof Error ? error.message : String(error));
}

mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, "eval-report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(
  join(reportDir, "eval-report.md"),
  `# Atlas eval report\n\n- Outcome: **${report.outcome}**\n- Revision: \`${report.revision}\`\n- Dirty worktree: **${report.dirtyWorktree ? "yes" : "no"}**\n- Fixture digest: \`${report.fixtureDigest}\`\n- Lockfile digest: \`${report.lockfileDigest}\`\n- Command: \`${report.command}\`\n\n${report.failures.length ? `## Failures\n\n${report.failures.map((failure) => `- ${failure}`).join("\n")}\n` : "All binary assertions passed. Manual browser and OAuth evidence remains a separate pending gate.\n"}`,
);
console.log(JSON.stringify(report, null, 2));
if (report.outcome === "fail") process.exitCode = 1;
