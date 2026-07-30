import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const readJson = <T>(path: string) => JSON.parse(read(path)) as T;
const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};
const unique = (values: string[], label: string) =>
  assert(new Set(values).size === values.length, `${label} contains duplicates`);
const hashFiles = (paths: string[]) => {
  const hash = createHash("sha256");
  for (const path of paths) hash.update(path).update(read(path));
  return hash.digest("hex");
};

type PublicRecord = {
  id: string;
  code: string;
  youtubeId: string;
  insightReviewStatus: "approved" | "unmapped";
};
type Manifest = {
  schemaVersion: number;
  catalogPolicy: {
    expectedRecordCount: number;
    expectedMappedInsightCount: number;
    expectedUnmappedCount: number;
    expectedInsightBasisCounts: Record<string, number>;
  };
  evals: Array<{
    id: string;
    requirementRefs: string[];
    gateType: "binary" | "manual";
    command: string | null;
    testOrFixture: string;
    passCriteria: string;
    privacyClassification: string;
    evidencePath: string;
    approver?: string;
    expiry?: string | null;
    waiver?: string | null;
  }>;
};

function validate() {
  const catalog = readJson<{ records: PublicRecord[] }>("src/data/atlas-public-catalog.json");
  const catalogBaseline = readJson<{ recordCount: number; records: PublicRecord[] }>(
    "evals/catalog-baseline.json",
  );
  const insightBaseline = readJson<{
    total: number;
    counts: Record<string, number>;
    timestamped: number;
    entries: Array<{ id: string }>;
  }>("evals/insight-baseline.json");
  const manifest = readJson<Manifest>("evals/manifest.json");
  const requirements = read("evals/requirements.md");
  const route = read("src/routes/index.tsx");

  assert(catalog.records.length === 984, "Public catalog must contain 984 records");
  assert(catalogBaseline.recordCount === 984, "Catalog baseline must contain 984 records");
  assert(manifest.catalogPolicy.expectedRecordCount === 984, "Manifest catalog count drifted");
  unique(catalog.records.map((record) => record.id), "catalog IDs");
  unique(catalog.records.map((record) => record.code), "catalog codes");
  unique(catalog.records.map((record) => record.youtubeId), "catalog YouTube IDs");
  assert(
    JSON.stringify(catalog.records.map((record) => record.id)) ===
      JSON.stringify(catalogBaseline.records.map((record) => record.id)),
    "Catalog identity or ordering drifted from baseline",
  );

  const approved = catalog.records.filter(
    (record) => record.insightReviewStatus === "approved",
  ).length;
  const unmapped = catalog.records.filter(
    (record) => record.insightReviewStatus === "unmapped",
  ).length;
  assert(approved === 348, "Approved insight mapping count must be 348");
  assert(unmapped === 636, "Unmapped metadata count must be 636");
  assert(insightBaseline.total === 348, "Insight baseline total must be 348");
  assert(insightBaseline.counts.transcript_backed === 344, "Transcript-backed count must be 344");
  assert(insightBaseline.counts.source_synthesis === 4, "Source-synthesis count must be four");
  assert(insightBaseline.timestamped === 347, "Timestamped insight count must be 347");
  unique(insightBaseline.entries.map((entry) => entry.id), "insight mapping IDs");
  assert(manifest.catalogPolicy.expectedMappedInsightCount === approved, "Manifest mapped count drifted");
  assert(manifest.catalogPolicy.expectedUnmappedCount === unmapped, "Manifest unmapped count drifted");

  for (const token of [
    "const PAGE_SIZE = 12",
    "IntersectionObserver",
    "Category:",
    "<Clock",
    "sm:h-[75vh]",
    "Why it matters",
    "Use it when",
  ])
    assert(route.includes(token), `Gallery or modal contract token missing: ${token}`);

  const requirementIds = new Set(
    [...requirements.matchAll(/`(ATLAS-[A-Z]+-\d{3})`/g)].map((match) => match[1]),
  );
  unique(manifest.evals.map((evaluation) => evaluation.id), "eval IDs");
  for (const evaluation of manifest.evals) {
    assert(evaluation.requirementRefs.length, `${evaluation.id} has no requirement references`);
    assert(
      evaluation.testOrFixture &&
        evaluation.passCriteria &&
        evaluation.privacyClassification &&
        evaluation.evidencePath,
      `${evaluation.id} lacks evidence metadata`,
    );
    for (const id of evaluation.requirementRefs)
      assert(requirementIds.has(id), `${evaluation.id} references unknown ${id}`);
    if (evaluation.gateType === "manual") {
      assert(evaluation.command === null, `${evaluation.id} manual gate claims a command`);
      assert(evaluation.approver !== undefined, `${evaluation.id} has no approver`);
      assert(
        evaluation.expiry !== undefined && evaluation.waiver !== undefined,
        `${evaluation.id} lacks waiver metadata`,
      );
    }
  }
}

const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const report = {
  schemaVersion: 1,
  executionStatus: "executed",
  outcome: "pass" as "pass" | "fail",
  command: "npm run evals:validate",
  revision,
  dirtyWorktree:
    execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim().length > 0,
  fixtureDigest: hashFiles([
    "evals/catalog-baseline.json",
    "evals/insight-baseline.json",
    "evals/manifest.json",
    "evals/requirements.md",
  ]),
  generatedAt: new Date().toISOString(),
  failures: [] as string[],
};
try {
  validate();
} catch (error) {
  report.outcome = "fail";
  report.failures.push(error instanceof Error ? error.message : String(error));
}
const reportDir = join(root, "artifacts/evals");
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, "eval-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (report.outcome === "fail") process.exitCode = 1;
