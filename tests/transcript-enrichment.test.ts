import { describe, expect, test } from "bun:test";

import { mergeTranscriptClassifications } from "../scripts/transcript-enrichment";
import { LAST_KNOWN_GOOD_CATALOG, catalogVideoSchema } from "../src/lib/atlas-catalog";
import { classifyVideoTopics } from "../src/lib/topic-classification";

const digest = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const source = LAST_KNOWN_GOOD_CATALOG[0]!;
const approvedArtifact = {
  schemaVersion: "atlas-local-evidence-v1" as const,
  videoId: source.id,
  themes: ["System Design", "Data & Eval", "Reliability"] as const,
  themeClassification: {
    source: "approved_local_transcript" as const,
    basis: "transcript_evidence_review" as const,
    reviewedAt: "2026-07-28T00:00:00Z",
    reviewerVersion: "fixture-v1",
  },
  transcript: {
    status: "acquired" as const,
    availability: "available" as const,
    sourceUrl: `https://www.youtube.com/watch?v=${source.youtubeId}`,
    provider: "approved-local-fixture",
    sourceType: "approved_transcript" as const,
    retrievedAt: "2026-07-28T00:00:00Z",
    acquisitionRunId: "fixture-run",
    locale: "en",
    sourceVersion: "fixture-v1",
    availabilityCheckedAt: "2026-07-28T00:00:00Z",
    termsBasis: "fixture terms",
    rightsBasis: "fixture rights",
    redistributionAllowed: true,
    attributionRequired: true,
    reviewedAt: "2026-07-28T00:00:00Z",
    digest,
    reviewStatus: "approved" as const,
    attributionEligible: true,
  },
  evidence: [
    {
      evidenceId: "fixture-evidence",
      videoId: source.id,
      text: "Approved paraphrase from the reviewed transcript.",
      timestampSeconds: 42,
      transcriptDigest: digest,
      status: "approved" as const,
      reviewedAt: "2026-07-28T00:00:00Z",
      reviewerVersion: "fixture-v1",
      speaker: null,
      speakerAttributionEligible: false,
    },
  ],
};

describe("local transcript enrichment", () => {
  test("classifies zero-to-many themes without publishing raw transcript text", () => {
    expect(
      classifyVideoTopics({
        title: "Production agent evaluation",
        transcript: "trace every workflow and reduce inference latency",
      }),
    ).toContain("Data & Eval");
    const result = mergeTranscriptClassifications([source], {
      version: 2,
      artifacts: [approvedArtifact],
    });
    expect(result.records[0]?.themes).toEqual(approvedArtifact.themes);
    expect(result.records[0]?.evidence[0]?.timestampSeconds).toBe(42);
    expect(JSON.stringify(result.records)).not.toContain("raw transcript");
  });

  test("fails closed for duplicate themes, a digest mismatch, or retracted evidence", () => {
    expect(() =>
      mergeTranscriptClassifications([source], {
        version: 2,
        artifacts: [{ ...approvedArtifact, themes: ["Reliability", "Reliability"] }],
      }),
    ).toThrow();
    expect(() =>
      catalogVideoSchema.parse({
        ...source,
        themes: [],
        transcript: approvedArtifact.transcript,
        evidence: [
          { ...approvedArtifact.evidence[0], transcriptDigest: digest.replace(/a$/, "b") },
        ],
      }),
    ).toThrow();
    expect(() =>
      catalogVideoSchema.parse({
        ...source,
        themes: [],
        transcript: approvedArtifact.transcript,
        evidence: [{ ...approvedArtifact.evidence[0], status: "retracted" }],
      }),
    ).toThrow();
  });
});
